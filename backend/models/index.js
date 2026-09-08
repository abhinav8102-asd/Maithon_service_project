const sequelize = require('../config/db.config');
const Role = require('./role.model');
const User = require('./user.model');
const Customer = require('./customer.model');
const Provider = require('./provider.model');
const Category = require('./category.model');
const Service = require('./service.model');
const Booking = require('./booking.model');
const Payment = require('./payment.model');
const Review = require('./review.model');
const ProviderGallery = require('./providerGallery.model');
const City = require('./city.model');
const Area = require('./area.model');
const Favorite = require('./favorite.model');
const Notification = require('./notification.model');
const ContactMessage = require('./contactMessage.model');
const FAQ = require('./faq.model');
const SystemSetting = require('./setting.model');
const ProviderService = require('./providerService.model');
const SubscriptionPackage = require('./subscriptionPackage.model');
const ProviderSubscription = require('./providerSubscription.model');
const Message = require('./message.model');

// ==========================================
// RELATIONSHIPS & ASSOCIATIONS
// ==========================================

// 1. User & Role
Role.hasMany(User, { foreignKey: 'roleId', onDelete: 'RESTRICT' });
User.belongsTo(Role, { foreignKey: 'roleId' });

// 2. User & Customer
User.hasOne(Customer, { foreignKey: 'userId', onDelete: 'CASCADE' });
Customer.belongsTo(User, { foreignKey: 'userId' });

// 3. User & Provider
User.hasOne(Provider, { foreignKey: 'userId', onDelete: 'CASCADE' });
Provider.belongsTo(User, { foreignKey: 'userId' });

// 4. City & Area
City.hasMany(Area, { foreignKey: 'cityId', onDelete: 'CASCADE' });
Area.belongsTo(City, { foreignKey: 'cityId' });

// 5. Locations for Customer
City.hasMany(Customer, { foreignKey: 'cityId', onDelete: 'SET NULL' });
Customer.belongsTo(City, { foreignKey: 'cityId' });

Area.hasMany(Customer, { foreignKey: 'areaId', onDelete: 'SET NULL' });
Customer.belongsTo(Area, { foreignKey: 'areaId' });

// 6. Locations for Provider
City.hasMany(Provider, { foreignKey: 'cityId', onDelete: 'SET NULL' });
Provider.belongsTo(City, { foreignKey: 'cityId' });

Area.hasMany(Provider, { foreignKey: 'areaId', onDelete: 'SET NULL' });
Provider.belongsTo(Area, { foreignKey: 'areaId' });

// 7. Provider & ProviderGallery
Provider.hasMany(ProviderGallery, { foreignKey: 'providerId', onDelete: 'CASCADE' });
ProviderGallery.belongsTo(Provider, { foreignKey: 'providerId' });

// 8. Category & Service
Category.hasMany(Service, { foreignKey: 'categoryId', onDelete: 'CASCADE' });
Service.belongsTo(Category, { foreignKey: 'categoryId' });

// 9. Provider & Service (Many-to-Many through ProviderService with custom pricing)
Provider.belongsToMany(Service, { 
  through: ProviderService, 
  foreignKey: 'providerId', 
  otherKey: 'serviceId', 
  as: 'services' 
});
Service.belongsToMany(Provider, { 
  through: ProviderService, 
  foreignKey: 'serviceId', 
  otherKey: 'providerId', 
  as: 'providers' 
});
Provider.hasMany(ProviderService, { foreignKey: 'providerId', onDelete: 'CASCADE' });
ProviderService.belongsTo(Provider, { foreignKey: 'providerId' });
Service.hasMany(ProviderService, { foreignKey: 'serviceId', onDelete: 'CASCADE' });
ProviderService.belongsTo(Service, { foreignKey: 'serviceId' });

// 10. Booking associations
Customer.hasMany(Booking, { foreignKey: 'customerId', onDelete: 'CASCADE' });
Booking.belongsTo(Customer, { foreignKey: 'customerId' });

Provider.hasMany(Booking, { foreignKey: 'providerId', onDelete: 'CASCADE' });
Booking.belongsTo(Provider, { foreignKey: 'providerId' });

Service.hasMany(Booking, { foreignKey: 'serviceId', onDelete: 'CASCADE' });
Booking.belongsTo(Service, { foreignKey: 'serviceId' });

// 11. Booking & Payment
Booking.hasOne(Payment, { foreignKey: 'bookingId', onDelete: 'CASCADE' });
Payment.belongsTo(Booking, { foreignKey: 'bookingId' });

// 12. Booking & Review
Booking.hasOne(Review, { foreignKey: 'bookingId', onDelete: 'CASCADE' });
Review.belongsTo(Booking, { foreignKey: 'bookingId' });

// 13. Customer/Provider & Review (Direct relationships for query optimization)
Customer.hasMany(Review, { foreignKey: 'customerId', onDelete: 'CASCADE' });
Review.belongsTo(Customer, { foreignKey: 'customerId' });

Provider.hasMany(Review, { foreignKey: 'providerId', onDelete: 'CASCADE' });
Review.belongsTo(Provider, { foreignKey: 'providerId' });

// 14. Favorites (Bookmarks)
Customer.hasMany(Favorite, { foreignKey: 'customerId', onDelete: 'CASCADE' });
Favorite.belongsTo(Customer, { foreignKey: 'customerId' });

Provider.hasMany(Favorite, { foreignKey: 'providerId', onDelete: 'CASCADE' });
Favorite.belongsTo(Provider, { foreignKey: 'providerId' });

// 15. User & Notification
User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });

// 16. Provider & ProviderSubscription
Provider.hasMany(ProviderSubscription, { foreignKey: 'providerId', onDelete: 'CASCADE' });
ProviderSubscription.belongsTo(Provider, { foreignKey: 'providerId' });

// 17. SubscriptionPackage & ProviderSubscription
SubscriptionPackage.hasMany(ProviderSubscription, { foreignKey: 'packageId', onDelete: 'RESTRICT' });
ProviderSubscription.belongsTo(SubscriptionPackage, { foreignKey: 'packageId' });

// 18. Message associations (referencing User)
User.hasMany(Message, { as: 'sentMessages', foreignKey: 'senderId', onDelete: 'CASCADE' });
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
User.hasMany(Message, { as: 'receivedMessages', foreignKey: 'receiverId', onDelete: 'CASCADE' });
Message.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });

// Export everything as a single DB interface
const db = {
  sequelize,
  Role,
  User,
  Customer,
  Provider,
  Category,
  Service,
  Booking,
  Payment,
  Review,
  ProviderGallery,
  City,
  Area,
  Favorite,
  Notification,
  ContactMessage,
  FAQ,
  SystemSetting,
  ProviderService,
  SubscriptionPackage,
  ProviderSubscription,
  Message
};

module.exports = db;
