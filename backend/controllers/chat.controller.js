const { Op } = require('sequelize');
const db = require('../models');
const logger = require('../utils/logger');

// 1. GET INBOX CONVERSATIONS
exports.getInbox = async (req, res, next) => {
  try {
    const userId = req.userId;
    
    // Fetch all messages involving the current user
    const messages = await db.Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      order: [['createdAt', 'DESC']]
    });

    // Map conversation data by partner ID
    const conversationsMap = {};
    for (const msg of messages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!conversationsMap[partnerId]) {
        conversationsMap[partnerId] = {
          lastMessage: msg.messageText || (msg.mediaUrl ? '📷 Sent an image attachment' : ''),
          lastMessageTime: msg.createdAt,
          unreadCount: 0,
          partnerId
        };
      }
      
      // Increment unread count for incoming messages not yet read
      if (msg.receiverId === userId && !msg.isRead) {
        conversationsMap[partnerId].unreadCount++;
      }
    }

    const partnerIds = Object.keys(conversationsMap);
    if (partnerIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Fetch partner details
    const partners = await db.User.findAll({
      where: { id: { [Op.in]: partnerIds } },
      attributes: ['id', 'name', 'email', 'phoneNumber'],
      include: [
        { model: db.Role, attributes: ['name'] },
        { model: db.Provider, attributes: ['businessName'], required: false }
      ]
    });

    const inbox = partners.map(p => {
      const pJson = p.toJSON();
      const roleName = pJson.Role ? pJson.Role.name : null;
      const businessName = pJson.Provider ? pJson.Provider.businessName : null;
      delete pJson.Role;
      delete pJson.Provider;
      
      // Key fix: Object.keys() returns strings, p.id is a number — must convert to match
      return {
        ...conversationsMap[p.id.toString()],
        partnerName: p.name,
        partnerRole: roleName,
        partnerBusinessName: businessName,
        partnerDetails: pJson
      };
    });

    // Sort conversations by last message timestamp descending
    inbox.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    res.status(200).json({
      success: true,
      data: inbox
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET MESSAGES BETWEEN TWO USERS (Chat History)
exports.getMessages = async (req, res, next) => {
  try {
    const userId = req.userId;
    const partnerId = parseInt(req.params.partnerId, 10);

    if (isNaN(partnerId)) {
      return res.status(400).json({ success: false, message: 'Invalid partner ID.' });
    }

    const messages = await db.Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId }
        ]
      },
      order: [['createdAt', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// 3. SEND MESSAGE (Supports text and/or secure media upload)
exports.sendMessage = async (req, res, next) => {
  try {
    const senderId = req.userId;
    const { receiverId, messageText } = req.body;
    let mediaUrl = null;

    if (req.file) {
      mediaUrl = `/uploads/chats/${req.file.filename}`;
    }

    if (!messageText && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Message text or media attachment is required.'
      });
    }

    // Verify receiver exists
    const receiver = await db.User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found.'
      });
    }

    const message = await db.Message.create({
      senderId,
      receiverId: parseInt(receiverId, 10),
      messageText,
      mediaUrl,
      isRead: false
    });

    // Fetch sender's name for real-time notification previews
    const sender = await db.User.findByPk(senderId, { attributes: ['name'] });
    const senderName = sender ? sender.name : 'Someone';

    // Broadcast message via Sockets
    const io = req.app.get('io');
    if (io) {
      const ids = [senderId, parseInt(receiverId, 10)].sort((a, b) => a - b);
      const roomId = `chat_${ids[0]}_${ids[1]}`;
      const msgJson = message.toJSON();
      
      // Emit message to the private room
      io.to(roomId).emit('receive_message', msgJson);

      // Emit new message notification globally to the recipient
      io.emit('new_notification', {
        receiverId: parseInt(receiverId, 10),
        senderId,
        senderName,
        messageText: mediaUrl ? '📷 Sent an image attachment' : messageText
      });
    }

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// 4. MARK CONVERSATION AS READ
exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.userId;
    const partnerId = parseInt(req.params.partnerId, 10);

    if (isNaN(partnerId)) {
      return res.status(400).json({ success: false, message: 'Invalid partner ID.' });
    }

    // Update all incoming messages in the conversation to isRead = true
    await db.Message.update(
      { isRead: true },
      {
        where: {
          senderId: partnerId,
          receiverId: userId,
          isRead: false
        }
      }
    );

    // Broadcast read receipt via Socket
    const io = req.app.get('io');
    if (io) {
      const ids = [userId, partnerId].sort((a, b) => a - b);
      const roomId = `chat_${ids[0]}_${ids[1]}`;
      io.to(roomId).emit('mark_as_read', { senderId: userId });
    }

    res.status(200).json({
      success: true,
      message: 'Messages marked as read.'
    });
  } catch (error) {
    next(error);
  }
};

// 5. GET PARTNER BASIC INFO (for chat header when no inbox entry exists yet)
exports.getPartnerInfo = async (req, res, next) => {
  try {
    const partnerId = parseInt(req.params.userId, 10);
    if (isNaN(partnerId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    const user = await db.User.findByPk(partnerId, {
      attributes: ['id', 'name', 'email'],
      include: [
        { model: db.Role, attributes: ['name'] },
        {
          model: db.Provider,
          required: false,
          attributes: ['businessName']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userJson = user.toJSON();
    res.status(200).json({
      success: true,
      data: {
        id: userJson.id,
        name: userJson.name,
        email: userJson.email,
        role: userJson.Role?.name || null,
        businessName: userJson.Provider?.businessName || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// 6. GET ALL CONVERSATIONS IN SYSTEM (Admin Monitor)
exports.getAllConversationsAdmin = async (req, res, next) => {
  try {
    const messages = await db.Message.findAll({
      order: [['createdAt', 'DESC']]
    });

    const conversations = {};
    for (const msg of messages) {
      const userIds = [msg.senderId, msg.receiverId].sort((a, b) => a - b);
      const key = `${userIds[0]}_${userIds[1]}`;
      
      if (!conversations[key]) {
        conversations[key] = {
          userAId: userIds[0],
          userBId: userIds[1],
          lastMessage: msg.messageText || (msg.mediaUrl ? '📷 Sent an image attachment' : ''),
          lastMessageTime: msg.createdAt,
          messageCount: 0
        };
      }
      conversations[key].messageCount++;
    }

    const conversationList = Object.values(conversations);

    const allUserIds = new Set();
    conversationList.forEach(c => {
      allUserIds.add(c.userAId);
      allUserIds.add(c.userBId);
    });

    if (allUserIds.size === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const users = await db.User.findAll({
      where: { id: { [Op.in]: Array.from(allUserIds) } },
      attributes: ['id', 'name', 'email'],
      include: [
        { model: db.Role, attributes: ['name'] },
        { model: db.Provider, attributes: ['businessName'], required: false }
      ]
    });

    const usersMap = {};
    users.forEach(u => {
      const uJson = u.toJSON();
      usersMap[u.id] = {
        name: uJson.name,
        email: uJson.email,
        role: uJson.Role?.name || null,
        businessName: uJson.Provider?.businessName || null
      };
    });

    const formattedConversations = conversationList.map(c => ({
      ...c,
      userAName: usersMap[c.userAId]?.name || `User #${c.userAId}`,
      userARole: usersMap[c.userAId]?.role,
      userABusinessName: usersMap[c.userAId]?.businessName,
      userBName: usersMap[c.userBId]?.name || `User #${c.userBId}`,
      userBRole: usersMap[c.userBId]?.role,
      userBBusinessName: usersMap[c.userBId]?.businessName
    }));

    res.status(200).json({
      success: true,
      data: formattedConversations
    });
  } catch (error) {
    next(error);
  }
};

// 7. GET CONVERSATION HISTORIES BETWEEN TWO USERS (Admin Monitor)
exports.getConversationMessagesAdmin = async (req, res, next) => {
  try {
    const userAId = parseInt(req.params.userA, 10);
    const userBId = parseInt(req.params.userB, 10);

    if (isNaN(userAId) || isNaN(userBId)) {
      return res.status(400).json({ success: false, message: 'Invalid user IDs.' });
    }

    const messages = await db.Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userAId, receiverId: userBId },
          { senderId: userBId, receiverId: userAId }
        ]
      },
      order: [['createdAt', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};


