import mongoose from "mongoose";
const { Schema } = mongoose;

const MessageSchema = new Schema({
  conversationId: {
    type: String,
    required: true,
    maxlength: 100,
  },
  userId: {
    type: String,
    required: true,
  },
  desc: {
    type: String,
    required: true,
    maxlength: 5000,
  },
},{
  timestamps:true
});

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model("Message", MessageSchema)