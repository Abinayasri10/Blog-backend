import Event from "../models/Event.js";
import User from "../models/User.js";

// Create new event (only professionals and admins)
export const createEvent = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Check if user is professional or admin
    if (user.userType !== 'professional' && user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only professionals and admins can create events"
      });
    }

    const { title, description, category, date, endDate, time, location, tags, maxAttendees, visibility, poster } = req.body;

    // Validation
    if (!title?.trim() || !description?.trim() || !date || !time || !location?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title, description, date, time, and location are required"
      });
    }

    const eventPoster = poster || '/event.jpg';

    const event = await Event.create({
      title: title.trim(),
      description: description.trim(),
      category: category || 'Other',
      organizer: userId,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : null,
      time: time.trim(),
      location: location.trim(),
      poster: eventPoster,
      tags: Array.isArray(tags) ? tags : [],
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      visibility: visibility || 'public'
    });

    // Populate organizer details
    await event.populate('organizer', 'name email profession');
    await event.populate('attendees', 'name email');

    console.log('✅ Event created successfully:', event._id);
    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create event'
    });
  }
};

// Get all events
export const getAllEvents = async (req, res) => {
  try {
    const { category, search, status, limit = 10, page = 1 } = req.query;
    let query = { visibility: 'public' };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const events = await Event.find(query)
      .populate('organizer', 'name email profession')
      .populate('attendees', 'name email')
      .sort({ date: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Event.countDocuments(query);

    res.json({
      success: true,
      events,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalEvents: total
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single event
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email profession')
      .populate('attendees', 'name email')
      .populate('registeredUsers.userId', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update event (only creator)
export const updateEvent = async (req, res) => {
  try {
    const userId = req.user._id;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is the organizer
    if (event.organizer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this event'
      });
    }

    const { title, description, category, date, endDate, time, location, tags, maxAttendees, status, visibility, poster } = req.body;

    Object.assign(event, {
      title: title?.trim() || event.title,
      description: description?.trim() || event.description,
      category: category || event.category,
      date: date ? new Date(date) : event.date,
      endDate: endDate ? new Date(endDate) : event.endDate,
      time: time?.trim() || event.time,
      location: location?.trim() || event.location,
      poster: poster || event.poster,
      tags: Array.isArray(tags) ? tags : event.tags,
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : event.maxAttendees,
      status: status || event.status,
      visibility: visibility || event.visibility
    });

    await event.save();
    await event.populate('organizer', 'name email profession');
    await event.populate('attendees', 'name email');

    res.json({
      success: true,
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete event (only creator)
export const deleteEvent = async (req, res) => {
  try {
    const userId = req.user._id;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is the organizer
    if (event.organizer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this event'
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Register for event
export const registerEvent = async (req, res) => {
  try {
    const userId = req.user._id;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if already registered
    const alreadyRegistered = event.registeredUsers.some(
      reg => reg.userId.toString() === userId.toString()
    );

    if (alreadyRegistered) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this event'
      });
    }

    // Check max attendees
    if (event.maxAttendees && event.registeredUsers.length >= event.maxAttendees) {
      return res.status(400).json({
        success: false,
        message: 'Event is full'
      });
    }

    event.registeredUsers.push({ userId });
    event.attendees.push(userId);
    await event.save();

    await event.populate('organizer', 'name email profession');
    await event.populate('attendees', 'name email');

    res.json({
      success: true,
      message: 'Registered successfully',
      event
    });
  } catch (error) {
    console.error('Register event error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Unregister from event
export const unregisterEvent = async (req, res) => {
  try {
    const userId = req.user._id;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    event.registeredUsers = event.registeredUsers.filter(
      reg => reg.userId.toString() !== userId.toString()
    );
    event.attendees = event.attendees.filter(
      att => att.toString() !== userId.toString()
    );
    await event.save();

    await event.populate('organizer', 'name email profession');
    await event.populate('attendees', 'name email');

    res.json({
      success: true,
      message: 'Unregistered successfully',
      event
    });
  } catch (error) {
    console.error('Unregister event error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get upcoming events count
export const getEventStats = async (req, res) => {
  try {
    const now = new Date();
    const upcomingCount = await Event.countDocuments({
      date: { $gte: now },
      visibility: 'public'
    });
    const pastCount = await Event.countDocuments({
      date: { $lt: now },
      visibility: 'public'
    });
    const categoryCounts = await Event.aggregate([
      { $match: { visibility: 'public' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        upcomingCount,
        pastCount,
        categoryCounts
      }
    });
  } catch (error) {
    console.error('Get event stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
