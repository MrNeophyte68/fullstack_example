import { CanvasGeometry, Point } from './canvas.types';
import { exportCanvas } from './canvas-export';
import {
    HEX_SQUARE_FACTOR,
    ROW_HEIGHT_FACTOR,
    MAP_BORDER_TOTAL,
    HALF_COLUMN,
    HEX_SIDES,
    CORNER_ANGLE,
    POINTY_TOP_ANGLE,
    HALF_TURN_DEGREES,
    MIN_GRID_STROKE,
    GRID_STROKE_RATIO,
    ROAD_WIDTH_RATIO,
    ROAD_NODE_RATIO,
    OBJECT_GLYPH_RATIO,
    PLAYER_OFFSET_RATIO,
    PLAYER_RADIUS_RATIO,
    ZOOM_STEP,
    MIN_VISIBLE_ROWS,
} from './hex-canvas.component.constants';
import { TERRAIN_COLORS } from '@app/app.constants';
import { requireValue } from '@common/invariant';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, NgZone, Output, ViewChild, inject } from '@angular/core';
import { MapData, MapObject, Player, Terrain, Tile } from '@common/models';
import { brush, columns, key, neighbors } from '@common/hex';
import { EditorService } from '@app/presentation/editor.service';

@Component({
    selector: 'app-hex-canvas',
    standalone: true,
    templateUrl: './hex-canvas.component.html',
    styleUrl: './hex-canvas.component.scss',
})
export class HexCanvasComponent implements AfterViewInit, OnDestroy {
    @ViewChild('surface') surface!: ElementRef<HTMLCanvasElement>;
    @Input() data?: MapData;
    @Input() readonly = false;
    @Input() players: Player[] = [];
    @Input() path: string[] = [];
    @Output() tileHover = new EventEmitter<Tile | undefined>();
    @Output() tileClick = new EventEmitter<Tile>();
    @Output() warning = new EventEmitter<string>();
    readonly editor = inject(EditorService);
    readonly labels: Record<Terrain, string> = { water: 'Eau', grass: 'Prairie', mountain: 'Montagne', forest: 'Forêt', desert: 'Désert' };
    hover?: Tile;
    private previousHover?: Tile;
    pointerX = 0;
    pointerY = 0;
    private zoom = 1;
    private panX = 0;
    private panY = 0;
    private drawing = false;
    private panning = false;
    private lastTile = '';
    private animation = 0;
    private observer?: ResizeObserver;
    private width = 0;
    private height = 0;
    private mapRows = 0;
    private previousMap?: MapData;
    private renderSignature = '';
    private readonly zone = inject(NgZone);
    get map(): MapData {
        return this.data ?? this.editor.map();
    }
    ngAfterViewInit(): void {
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(this.surface.nativeElement);
        this.resize();
        this.zone.runOutsideAngular(() => this.frame());
    }
    ngOnDestroy(): void {
        cancelAnimationFrame(this.animation);
        this.observer?.disconnect();
    }
    fit(): void {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
    }
    private resize(): void {
        const canvas = this.surface.nativeElement;
        this.width = canvas.clientWidth;
        this.height = canvas.clientHeight;
        canvas.width = this.width * devicePixelRatio;
        canvas.height = this.height * devicePixelRatio;
        this.clamp();
    }
    private geometry(): CanvasGeometry {
        const unitsWidth = (columns(this.map.rows) + 1) * Math.sqrt(HEX_SQUARE_FACTOR);
        const unitsHeight = ROW_HEIGHT_FACTOR * (this.map.rows - 1) + 2;
        const radius = Math.min((this.width - MAP_BORDER_TOTAL) / unitsWidth, (this.height - MAP_BORDER_TOTAL) / unitsHeight) * this.zoom;
        const width = unitsWidth * radius;
        const height = unitsHeight * radius;
        return { radius, width, height, originX: (this.width - width) / 2 + this.panX, originY: (this.height - height) / 2 + this.panY };
    }
    private center(tile: Point): Point {
        const g = this.geometry();
        return {
            x: g.originX + (tile.x + (tile.y % 2 === 0 ? 1 : HALF_COLUMN)) * Math.sqrt(HEX_SQUARE_FACTOR) * g.radius,
            y: g.originY + (1 + tile.y * ROW_HEIGHT_FACTOR) * g.radius,
        };
    }
    private polygon(context: CanvasRenderingContext2D, tile: Tile): void {
        const center = this.center(tile);
        const radius = this.geometry().radius;
        context.beginPath();
        for (let corner = 0; corner < HEX_SIDES; corner++) {
            const angle = ((corner * CORNER_ANGLE - POINTY_TOP_ANGLE) * Math.PI) / HALF_TURN_DEGREES;
            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;
            if (!corner) context.moveTo(x, y);
            else context.lineTo(x, y);
        }
        context.closePath();
    }
    private frame = (): void => {
        this.draw();
        this.animation = requestAnimationFrame(this.frame);
    };
    private draw(): void {
        if (this.mapRows !== this.map.rows) {
            this.mapRows = this.map.rows;
            this.fit();
        }
        const signature = JSON.stringify([
            this.width,
            this.height,
            this.zoom,
            this.panX,
            this.panY,
            this.editor.revision(),
            this.hover ? key(this.hover) : '',
            this.editor.tool,
            this.editor.radius,
            this.editor.terrain,
            this.path,
            this.players,
        ]);
        if (this.previousMap === this.map && signature === this.renderSignature && !this.players.some((player) => player.movement)) return;
        this.previousMap = this.map;
        this.renderSignature = signature;
        const context = requireValue(this.surface.nativeElement.getContext('2d'));
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        context.fillStyle = '#000';
        context.fillRect(0, 0, this.width, this.height);
        const radius = this.geometry().radius;
        const preview = new Set(
            this.hover && !this.readonly && this.editor.tool === 'paint' ? brush(this.hover, this.map.tiles, this.editor.radius).map(key) : [],
        );
        const path = new Set(this.path);
        for (const tile of this.map.tiles) this.drawTile(tile, context, preview, path);
        this.players.forEach((player, index) => this.drawPlayer(context, player, index, radius));
    }
    private drawTile(tile: Tile, inputContext: CanvasRenderingContext2D, preview: Set<string>, path: Set<string>): void {
        const context = inputContext;
        const radius = this.geometry().radius;
            const center = this.center(tile);
            if (center.x < -radius || center.x > this.width + radius || center.y < -radius || center.y > this.height + radius) return;
            this.polygon(context, tile);
            context.fillStyle = TERRAIN_COLORS[preview.has(key(tile)) ? this.editor.terrain : tile.terrain];
            context.fill();
            context.strokeStyle = '#10242e';
            context.lineWidth = Math.max(MIN_GRID_STROKE, radius * GRID_STROKE_RATIO);
            context.stroke();
            if (path.has(key(tile))) {
                context.fillStyle = '#07192180';
                context.fill();
            }
            if (preview.has(key(tile)) || this.hover === tile) {
                context.strokeStyle = '#fff0b9';
                context.lineWidth = 1.8;
                context.stroke();
            }
            this.drawObject(context, tile, radius);

    }
    private drawObject(inputContext: CanvasRenderingContext2D, tile: Tile, radius: number): void {
        const context = inputContext;

        const center = this.center(tile);
        if (tile.object === MapObject.Road) {
            context.strokeStyle = '#f5d99d';
            context.lineWidth = Math.max(HEX_SQUARE_FACTOR, radius * ROAD_WIDTH_RATIO);
            context.lineCap = 'round';
            const linked = neighbors(tile, this.map.tiles).filter((other) => other.object === MapObject.Road || other.object === MapObject.City);
            for (const other of linked) {
                const end = this.center(other);
                context.beginPath();
                context.moveTo(center.x, center.y);
                context.lineTo((center.x + end.x) / 2, (center.y + end.y) / 2);
                context.stroke();
            }
            context.fillStyle = '#f5d99d';
            context.beginPath();
            context.arc(center.x, center.y, radius * ROAD_NODE_RATIO, 0, Math.PI * 2);
            context.fill();
        } else if (tile.object) {
            context.fillStyle = '#fff4d2';
            context.font = `bold ${radius * OBJECT_GLYPH_RATIO}px system-ui`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(tile.object === MapObject.City ? '▣' : '⚑', center.x, center.y);
        }
    }
    private drawPlayer(inputContext: CanvasRenderingContext2D, player: Player, index: number, radius: number): void {
        const context = inputContext;

        const parse = (value: string): Point => {
            const [x, y] = value.split(',').map(Number);
            return { x, y };
        };
        let center = this.center(parse(player.tile));
        if (player.movement) {
            const from = this.center(parse(player.movement.from));
            const to = this.center(parse(player.movement.to));
            const progress = Math.min(1, (Date.now() - player.movement.startedAt) / player.movement.duration);
            center = { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
        }
        const angle = (index * Math.PI) / 2;
        center.x += Math.cos(angle) * radius * PLAYER_OFFSET_RATIO;
        center.y += Math.sin(angle) * radius * PLAYER_OFFSET_RATIO;
        context.beginPath();
        context.arc(center.x, center.y, radius * PLAYER_RADIUS_RATIO, 0, Math.PI * 2);
        context.fillStyle = player.color;
        context.fill();
        context.strokeStyle = '#fff';
        context.lineWidth = ROW_HEIGHT_FACTOR;
        context.stroke();
    }
    private locate(event: PointerEvent): Tile | undefined {
        const bounds = this.surface.nativeElement.getBoundingClientRect();
        this.pointerX = event.clientX - bounds.left;
        this.pointerY = event.clientY - bounds.top;
        const context = requireValue(this.surface.nativeElement.getContext('2d'));
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        const tile = this.map.tiles.find((item) => {
            const center = this.center(item);
            if (Math.abs(center.x - this.pointerX) > this.geometry().radius || Math.abs(center.y - this.pointerY) > this.geometry().radius)
                return false;
            this.polygon(context, item);
            return context.isPointInPath(this.pointerX, this.pointerY);
        });
        context.restore();
        return tile;
    }
    down(event: PointerEvent): void {
        event.preventDefault();
        this.surface.nativeElement.focus();
        const tile = this.locate(event);
        if (event.button === 2 && !event.shiftKey) {
            this.panning = true;
            this.editor.busy.set(true);
            return;
        }
        if (!tile) return;
        if (this.readonly) {
            if (event.button === 0) this.tileClick.emit(tile);
            return;
        }
        this.editor.begin();
        this.drawing = true;
        this.lastTile = key(tile);
        const warning = this.editor.apply(tile, event.shiftKey, event.button === 2 && event.shiftKey);
        if (warning) this.warning.emit(warning);
    }
    move(event: PointerEvent): void {
        const previousX = this.pointerX;
        const previousY = this.pointerY;
        const tile = this.locate(event);
        this.hover = tile;
        const cursor = this.editor.tool === 'inspect' ? 'help' : 'crosshair';
        this.surface.nativeElement.style.cursor = this.panning ? 'grabbing' : cursor;
        if (this.panning) {
            this.panX += this.pointerX - previousX;
            this.panY += this.pointerY - previousY;
            this.clamp();
        }
        if (this.drawing && tile && key(tile) !== this.lastTile && ['paint', 'road'].includes(this.editor.tool)) {
            this.lastTile = key(tile);
            const warning = this.editor.apply(tile, event.shiftKey);
            if (warning) this.warning.emit(warning);
        }
        if (tile !== this.previousHover) {
            this.previousHover = tile;
            this.tileHover.emit(tile);
        }
    }
    end(): void {
        if (this.drawing) this.editor.end();
        this.drawing = false;
        this.panning = false;
        this.editor.busy.set(false);
    }
    leave(): void {
        this.end();
        this.hover = undefined;
        this.tileHover.emit(undefined);
    }
    wheel(event: WheelEvent): void {
        event.preventDefault();
        const bounds = this.surface.nativeElement.getBoundingClientRect();
        this.zoomAt(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, event.clientX - bounds.left, event.clientY - bounds.top);
    }
    zoomAt(factor: number, x = this.width / 2, y = this.height / 2): void {
        const previous = this.zoom;
        this.zoom = Math.min(this.map.rows / MIN_VISIBLE_ROWS, Math.max(1, this.zoom * factor));
        const ratio = this.zoom / previous;
        this.panX = (this.panX + this.width / 2 - x) * ratio - this.width / 2 + x;
        this.panY = (this.panY + this.height / 2 - y) * ratio - this.height / 2 + y;
        this.clamp();
    }
    private clamp(): void {
        if (!this.width) return;
        const geometry = this.geometry();
        const maxX = Math.max(0, (geometry.width - this.width + MAP_BORDER_TOTAL) / 2);
        const maxY = Math.max(0, (geometry.height - this.height + MAP_BORDER_TOTAL) / 2);
        this.panX = Math.max(-maxX, Math.min(maxX, this.panX));
        this.panY = Math.max(-maxY, Math.min(maxY, this.panY));
    }
    @HostListener('window:keydown', ['$event']) keydown(event: KeyboardEvent): void {
        if ((event.target as HTMLElement).matches('input,textarea,select')) return;
        if (event.key === '=' || event.key === '+') {
            event.preventDefault();
            this.zoomAt(ZOOM_STEP);
        }
        if (event.key === '-') {
            event.preventDefault();
            this.zoomAt(1 / ZOOM_STEP);
        }
    }
    export(): void {
 exportCanvas(this.surface.nativeElement, this.editor.name); 
}
}
