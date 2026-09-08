const { SystemSetting } = require('../models');

// GET settings (Public)
exports.getSettings = async (req, res, next) => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      // Return a default settings object if DB is not seeded yet
      return res.status(200).json({
        success: true,
        data: {
          logo: null,
          contactPhone: '',
          contactEmail: '',
          contactAddress: '',
          facebookLink: '',
          instagramLink: '',
          privacyPolicy: '',
          termsConditions: ''
        }
      });
    }
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (err) {
    next(err);
  }
};

// PUT settings (Admin only)
exports.updateSettings = async (req, res, next) => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({
        logo: null,
        contactPhone: '',
        contactEmail: '',
        contactAddress: '',
        facebookLink: '',
        instagramLink: '',
        privacyPolicy: '',
        termsConditions: '',
        heroSubtitle: 'SMART LOCAL SOLUTION',
        heroTitle: 'LOCAL SERVICES & MAINTENANCE SYSTEM',
        heroDescription: 'A modern platform to book, track & resolve local maintenance and home service issues efficiently.',
        heroBgImage: null
      });
    }

    const updateData = {
      contactPhone: req.body.contactPhone,
      contactEmail: req.body.contactEmail,
      contactAddress: req.body.contactAddress,
      facebookLink: req.body.facebookLink,
      instagramLink: req.body.instagramLink,
      privacyPolicy: req.body.privacyPolicy,
      termsConditions: req.body.termsConditions,
      heroSubtitle: req.body.heroSubtitle,
      heroTitle: req.body.heroTitle,
      heroDescription: req.body.heroDescription,
      featuresJson: req.body.featuresJson,
      modulesJson: req.body.modulesJson,
      statsJson: req.body.statsJson,
      workflowJson: req.body.workflowJson
    };

    // If logo/heroBgImage uploaded, save the upload path
    if (req.file) {
      if (req.file.fieldname === 'logo') {
        updateData.logo = `/uploads/services/${req.file.filename}`;
      } else if (req.file.fieldname === 'heroBgImage') {
        updateData.heroBgImage = `/uploads/services/${req.file.filename}`;
      }
    }

    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        updateData.logo = `/uploads/services/${req.files.logo[0].filename}`;
      }
      if (req.files.heroBgImage && req.files.heroBgImage[0]) {
        updateData.heroBgImage = `/uploads/services/${req.files.heroBgImage[0].filename}`;
      }
    }

    await settings.update(updateData);

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully.',
      data: settings
    });
  } catch (err) {
    next(err);
  }
};
