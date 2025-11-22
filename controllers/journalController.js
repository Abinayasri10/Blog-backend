import Journal from "../models/Journal.js";

// Create Journal Entry
export const createEntry = async (req, res) => {
  try {
    const { title, content, mood, tags, privacy } = req.body;
    const entry = await Journal.create({
      user: req.user._id,
      title,
      content,
      mood,
      tags,
      privacy,
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Journal Entries for User
export const getEntries = async (req, res) => {
  try {
    const entries = await Journal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
