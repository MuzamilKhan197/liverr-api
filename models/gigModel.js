import mongoose from "mongoose";
const { Schema } = mongoose;

const GigSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    desc: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    totalStars: {
      type: Number,
      default: 0,
    },
    starNumber: {
      type: Number,
      default: 0,
    },
    cat: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    price: {
      type: Number,
      required: true,
      min: 1,
    },
    cover: {
      type: String,
      required: true,
      maxlength: 2048,
    },
    images: {
      type: [String],
      default: [],
    },
    shortTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    shortDesc: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    deliveryTime: {
      type: Number,
      required: true,
      min: 1,
    },
    revisionNumber: {
      type: Number,
      required: true,
      min: 0,
    },
    features: {
      type: [String],
      default: [],
      validate: {
        validator: (features) => features.every((feature) => feature.length <= 100),
        message: "Each feature must be 100 characters or fewer.",
      },
    },
    sales: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Gig", GigSchema);