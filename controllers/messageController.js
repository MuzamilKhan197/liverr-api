import createError from "../utils/createError.js";
import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";

const getParticipantFilter = (userId) => ({
  $or: [{ sellerId: userId }, { buyerId: userId }],
});

export const createMessage = async (req, res, next) => {
  const { conversationId, desc } = req.body || {};
  if (
    typeof conversationId !== "string" ||
    typeof desc !== "string" ||
    !desc.trim() ||
    desc.trim().length > 5000
  ) {
    return next(createError(400, "A conversation and non-empty message are required."));
  }

  try {
    const conversation = await Conversation.findOne({
      id: conversationId,
      ...getParticipantFilter(req.userId),
    });
    if (!conversation) {
      return next(createError(404, "Conversation not found."));
    }

    const savedMessage = await new Message({
      conversationId,
      userId: req.userId,
      desc: desc.trim(),
    }).save();

    conversation.set({
      readBySeller: req.isSeller,
      readByBuyer: !req.isSeller,
      lastMessage: desc.trim(),
    });
    await conversation.save();

    return res.status(201).json(savedMessage);
  } catch (err) {
    return next(err);
  }
};

export const getMessages = async (req, res, next) => {
  if (req.params.id.length > 100) {
    return next(createError(400, "Invalid conversation id."));
  }

  try {
    const conversation = await Conversation.findOne({
      id: req.params.id,
      ...getParticipantFilter(req.userId),
    });
    if (!conversation) {
      return next(createError(404, "Conversation not found."));
    }

    const messages = await Message.find({ conversationId: req.params.id })
      .sort({ createdAt: 1 })
      .limit(500);
    await Conversation.updateOne(
      { _id: conversation._id },
      req.isSeller
        ? { $set: { readBySeller: true } }
        : { $set: { readByBuyer: true } },
    );
    return res.status(200).json(messages);
  } catch (err) {
    return next(err);
  }
};
