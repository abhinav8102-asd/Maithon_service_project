const db = require('../models');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    console.log('Starting Database Synchronization...');
    // Development mode me hum force: true use kar rahe hain taaki naye tables automatically update ho sakein.
    await db.sequelize.sync({ force: true });
    console.log('Database synced successfully!');

    console.log('Seeding initial data...');

    // 1. Seed Roles
    const adminRole = await db.Role.create({ name: 'Admin' });
    const providerRole = await db.Role.create({ name: 'Provider' });
    const customerRole = await db.Role.create({ name: 'Customer' });
    console.log('Roles seeded successfully.');

    // 2. Seed Default Admin User
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    await db.User.create({
      roleId: adminRole.id,
      name: 'Super Admin',
      email: 'admin@localservice.com',
      passwordHash: adminPasswordHash,
      phoneNumber: '9999999999',
      status: 'Active'
    });
    console.log('Admin user seeded: admin@localservice.com / Password: Admin@123');

    // 3. Seed Cities & Areas (Customized for Maithon and nearby regions)
    const dhanbad = await db.City.create({ name: 'Dhanbad', state: 'Jharkhand' });
    const bardhaman = await db.City.create({ name: 'Paschim Bardhaman', state: 'West Bengal' });

    // Dhanbad Areas (including Maithon)
    const areaMaithon = await db.Area.create({ cityId: dhanbad.id, name: 'Maithon Dam', pincode: '828207' });
    await db.Area.create({ cityId: dhanbad.id, name: 'Chirkunda', pincode: '828202' });
    await db.Area.create({ cityId: dhanbad.id, name: 'Kumardhubi', pincode: '828203' });
    await db.Area.create({ cityId: dhanbad.id, name: 'Mugma', pincode: '828204' });

    // Paschim Bardhaman Areas (Maithon border regions in West Bengal side)
    await db.Area.create({ cityId: bardhaman.id, name: 'Barakar', pincode: '713324' });
    await db.Area.create({ cityId: bardhaman.id, name: 'Kulti', pincode: '713343' });
    await db.Area.create({ cityId: bardhaman.id, name: 'Asansol', pincode: '713301' });
    console.log('Cities and Areas seeded.');

    // 4. Seed Categories
    const categories = [
      { name: 'Electrician', slug: 'electrician' },
      { name: 'Plumber', slug: 'plumber' },
      { name: 'AC Repair', slug: 'ac-repair' },
      { name: 'Carpenter', slug: 'carpenter' },
      { name: 'Painter', slug: 'painter' },
      { name: 'RO Water Service', slug: 'ro-service' },
      { name: 'Cleaning Services', slug: 'cleaning-services' },
      { name: 'CCTV Installation', slug: 'cctv-installation' }
    ];

    for (const cat of categories) {
      await db.Category.create(cat);
    }
    console.log('Service Categories seeded.');

    // 5. Seed some basic Services
    const electricianCat = await db.Category.findOne({ where: { slug: 'electrician' } });
    if (electricianCat) {
      await db.Service.create({
        categoryId: electricianCat.id,
        name: 'House Wiring & Short Circuit Fix',
        price: 499.00,
        durationMinutes: 120,
        description: 'Complete inspection and wiring repair for the entire house. Includes testing of all main distribution boxes.',
        requiredTools: JSON.stringify(['Tester', 'Insulated pliers', 'Multimeter', 'PVC tape']),
        status: 'Active'
      });
      await db.Service.create({
        categoryId: electricianCat.id,
        name: 'Ceiling Fan Repair / Installation',
        price: 150.00,
        durationMinutes: 30,
        description: 'Installation of a ceiling fan or replacement of condenser and regulator switches.',
        requiredTools: JSON.stringify(['Ladder', 'Tester', 'Screwdrivers']),
        status: 'Active'
      });
    }

    const acRepairCat = await db.Category.findOne({ where: { slug: 'ac-repair' } });
    if (acRepairCat) {
      await db.Service.create({
        categoryId: acRepairCat.id,
        name: 'Split AC Servicing (Jet Wash)',
        price: 599.00,
        durationMinutes: 60,
        description: 'Deep high-pressure water jet cleaning of indoor cooling coil, outdoor unit service, air filter washing, and drain pipe flushing.',
        requiredTools: JSON.stringify(['Water jet pump', 'Service jacket bag', 'Ladder', 'Coil cleaner']),
        status: 'Active'
      });
    }

    console.log('Services seeded.');
    console.log('Database seeding process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
