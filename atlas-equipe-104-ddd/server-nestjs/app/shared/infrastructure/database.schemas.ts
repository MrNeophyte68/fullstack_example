import { Schema, InferSchemaType, HydratedDocument } from 'mongoose';
export const userSchema = new Schema(
    { name: String, normalizedName: { type: String, unique: true }, passwordHash: String },
    { timestamps: true },
);
export const mapSchema = new Schema(
    {
        name: String,
        normalizedName: { type: String, unique: true },
        ownerId: String,
        ownerName: String,
        visibility: String,
        rows: Number,
        tiles: [{ _id: false, x: Number, y: Number, terrain: String, object: String }],
    },
    { timestamps: true },
);

export type MapDocument = HydratedDocument<InferSchemaType<typeof mapSchema>>;
