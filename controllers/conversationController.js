import createError from "../utils/createError.js";
import Conversation from "../models/conversationModel.js";
import User from "../models/userModel.js";

export const createConversation = async (req, res, next) => {
  const recipientId = req.body?.to;
  const sellerId = req.isSeller ? req.userId : recipientId;
  const buyerId = req.isSeller ? recipientId : req.userId;
  if (
    typeof recipientId !== "string" ||
    recipientId === req.userId ||
    !/^[a-f\d]{24}$/i.test(recipientId)
  ) {
    return next(createError(400, "A valid conversation recipient is required."));
  }

  try {
    const recipient = await User.findById(recipientId).select("isSeller");
    if (!recipient || recipient.isSeller === req.isSeller) {
      return next(createError(404, "Conversation recipient not found."));
    }

    const id = `${sellerId}${buyerId}`;
    const existing = await Conversation.findOne({ id });
    if (existing) {
      return res.status(200).json(existing);
    }

    const savedConversation = await new Conversation({
      id,
      sellerId,
      buyerId,
      readBySeller: req.isSeller,
      readByBuyer: !req.isSeller,
    }).save();
    return res.status(201).json(savedConversation);
  } catch (err) {
    if (err.code === 11000) {
      const existing = await Conversation.findOne({
        id: `${sellerId}${buyerId}`,
      });
      if (existing) {
        return res.status(200).json(existing);
      }
    }
    return next(err);
  }
};

export const updateConversation = async (req, res, next) => {
  try {
    const updatedConversation = await Conversation.findOneAndUpdate(
      {
        id: req.params.id,
        ...(req.isSeller ? { sellerId: req.userId } : { buyerId: req.userId }),
      },
      {
        $set: {
          // readBySeller: true,
          // readByBuyer: true,
          ...(req.isSeller ? { readBySeller: true } : { readByBuyer: true }),
        },
      },
      { new: true }
    );

    if (!updatedConversation) {
      return next(createError(404, "Conversation not found."));
    }
    return res.status(200).json(updatedConversation);
  } catch (err) {
    return next(err);
  }
};

export const getSingleConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      id: req.params.id,
      ...(req.isSeller ? { sellerId: req.userId } : { buyerId: req.userId }),
    });
    if (!conversation) return next(createError(404, "Not found!"));
    return res.status(200).json(conversation);
  } catch (err) {
    return next(err);
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find(
      req.isSeller ? { sellerId: req.userId } : { buyerId: req.userId }
    ).sort({ updatedAt: -1 });
    return res.status(200).json(conversations);
  } catch (err) {
    return next(err);
  }
};