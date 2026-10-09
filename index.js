require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const Application = require('./models/Application');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solarconnect';

// Middleware (accept larger payload for base64 signature/photo previews)
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '15mb' }));

let dbConnected = false;
let inMemoryRegistrations = [];
let registrationCounter = 1;

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 3000,
  })
  .then(async () => {
    dbConnected = true;
    console.log('✅ Connected to MongoDB successfully.');
    try {
      const count = await Application.countDocuments();
      registrationCounter = count + 1;
    } catch (e) {
      console.warn('Error counting initial documents:', e);
    }
  })
  .catch((err) => {
    dbConnected = false;
    console.warn('⚠️ MongoDB connection offline, running in-memory fallback:', err.message);
  });

// Format Registration ID as SC-0001, SC-0002, etc.
const formatRegId = (num) => {
  return 'SC-' + String(num).padStart(4, '0');
};

// Calculate next sequential Registration ID (SC-0001, SC-0002, etc.) based on all existing records
const getNextSequentialRegId = async () => {
  if (dbConnected) {
    try {
      const allApps = await Application.find({}, { registrationId: 1 }).lean();
      let maxNum = 0;
      for (const app of allApps) {
        if (app.registrationId) {
          const match = app.registrationId.match(/SC-(\d+)/i);
          if (match) {
            const val = parseInt(match[1], 10);
            if (val > maxNum) maxNum = val;
          }
        }
      }
      return formatRegId(maxNum + 1);
    } catch (e) {
      console.error('Error finding max registrationId:', e);
      const count = await Application.countDocuments();
      return formatRegId(count + 1);
    }
  } else {
    let maxNum = 0;
    for (const app of inMemoryRegistrations) {
      if (app.registrationId) {
        const match = app.registrationId.match(/SC-(\d+)/i);
        if (match) {
          const val = parseInt(match[1], 10);
          if (val > maxNum) maxNum = val;
        }
      }
    }
    return formatRegId(maxNum + 1);
  }
};

// ---------------------------------------------------------------------------
// 1. Health & Next ID API
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'SolarConnect Digital Registration System',
    scheme: 'PM Surya Ghar: Muft Bijli Yojana',
    version: '1.0',
    database: dbConnected ? 'MongoDB Connected' : 'In-Memory Fallback',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/next-id', async (req, res) => {
  try {
    const nextId = await getNextSequentialRegId();
    res.json({
      success: true,
      nextId,
    });
  } catch (err) {
    console.error('Error fetching next-id:', err);
    res.json({ success: true, nextId: formatRegId(1) });
  }
});

// ---------------------------------------------------------------------------
// 2. Auth: Register & Login Endpoints
// ---------------------------------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, mobile, password, role } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    if (!fullName || fullName.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanMobile = mobile ? mobile.trim() : '';
    const userRole = role || (cleanEmail.includes('admin') || cleanEmail.includes('office') ? 'admin' : 'executive');

    if (dbConnected) {
      const existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists. Please Sign In.',
        });
      }

      const newUser = await User.create({
        fullName: fullName.trim(),
        email: cleanEmail,
        mobile: cleanMobile,
        password: password || 'solar@123',
        role: userRole,
      });

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully! You can now Sign In.',
        user: newUser,
      });
    } else {
      const existing = inMemoryUsers.find((u) => u.email === cleanEmail);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists. Please Sign In.',
        });
      }

      const newUser = {
        _id: 'user_' + Date.now(),
        fullName: fullName.trim(),
        email: cleanEmail,
        mobile: cleanMobile,
        password: password || 'solar@123',
        role: userRole,
        executiveId: 'EX-' + Math.floor(100 + Math.random() * 900),
        lastLogin: new Date(),
      };
      inMemoryUsers.push(newUser);

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully! You can now Sign In.',
        user: newUser,
      });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (dbConnected) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email. Please click "Register / Create Account" first.',
        });
      }

      // Check password if set
      if (password && user.password && user.password !== password) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password. Please try again.',
        });
      }

      user.lastLogin = new Date();
      await user.save();

      return res.json({
        success: true,
        message: `Welcome back, ${user.fullName || user.email}!`,
        user,
      });
    } else {
      let user = inMemoryUsers.find((u) => u.email === cleanEmail);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email. Please click "Register / Create Account" first.',
        });
      }

      user.lastLogin = new Date();
      return res.json({
        success: true,
        message: `Welcome back, ${user.fullName || user.email}!`,
        user,
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// ---------------------------------------------------------------------------
// 2.5 Quick Connection Registration (For Landing Page Direct Leads)
// ---------------------------------------------------------------------------
app.post('/api/quick-connection', async (req, res) => {
  try {
    const { fullName, mobile, districtCity, avgMonthlyBill } = req.body;

    if (!fullName || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Full name and mobile number are required.',
      });
    }

    const regId = await getNextSequentialRegId();
    const cleanMobile = String(mobile).replace(/\D/g, '');
    const cleanCity = (districtCity || 'Not Specified').trim();

    const quickRecord = {
      registrationId: regId,
      executiveName: 'Online Portal / Quick Lead',
      executiveId: 'EX-ONLINE-LEAD',
      areaDistrict: cleanCity,
      issuedOn: new Date(),
      submissionMode: 'SELF_APPLICANT',

      fullName: fullName.trim(),
      mobile: cleanMobile,
      alternateNo: '',
      email: `${cleanMobile}@solarconnect.in`,
      address: cleanCity,
      districtCity: cleanCity,
      pinCode: '800001',

      consumerNo: 'PENDING-' + Math.floor(100000 + Math.random() * 900000),
      avgMonthlyBill: Number(avgMonthlyBill) || 2500,
      connectionName: 'Self',
      propertyType: 'Residential',
      ownership: 'Owned',
      propertyAddress: cleanCity,
      landDetails: '',
      rooftopArea: 0,
      roofType: 'RCC',

      documents: {
        aadhaarCard: { collected: false },
        panCard: { collected: false },
        bijliBill: { collected: false },
        bankPassbook: { collected: false },
        jaminRasid: { collected: false },
        rooftopGpsPhoto: { collected: false },
      },

      declarationAccepted: true,
      applicantSignature: fullName.trim(),
      executiveSignature: 'Online Registration',

      verification: {
        status: 'Pending',
        remarks: 'New Online Solar Connection Request from Landing Page',
      },
    };

    let savedRecord;
    if (dbConnected) {
      savedRecord = await Application.create(quickRecord);
      registrationCounter++;
    } else {
      savedRecord = { _id: 'rec_' + Date.now(), ...quickRecord, createdAt: new Date() };
      inMemoryRegistrations.unshift(savedRecord);
    }

    return res.status(201).json({
      success: true,
      message: `Solar Connection Registration ${regId} successful!`,
      registrationId: regId,
      registration: savedRecord,
    });
  } catch (err) {
    console.error('Quick connection error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// 3. New Digital Registration (Section 6 & 8)
// ---------------------------------------------------------------------------
app.post('/api/registrations', async (req, res) => {
  try {
    const payload = req.body;

    // Allow submission if userEmail, email or mobile is provided
    if (!payload.userEmail && !payload.email && !payload.mobile) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied: Please Register or Sign In before submitting an application.',
      });
    }

    // Determine next sequential Registration ID (e.g. SC-0001, SC-0002, etc.)
    const regId = await getNextSequentialRegId();

    const newRecord = {
      registrationId: regId,
      executiveName: payload.executiveName || 'Self / Online Applicant',
      executiveId: payload.executiveId || 'EX-ONLINE',
      areaDistrict: payload.areaDistrict || payload.districtCity || 'General',
      issuedOn: payload.issuedOn || new Date(),
      submissionMode: payload.submissionMode || 'SELF_APPLICANT',

      // Applicant details
      fullName: payload.fullName,
      mobile: payload.mobile,
      alternateNo: payload.alternateNo || '',
      email: payload.email || '',
      address: payload.address,
      districtCity: payload.districtCity,
      pinCode: payload.pinCode,

      // Property & Electricity
      consumerNo: payload.consumerNo,
      avgMonthlyBill: Number(payload.avgMonthlyBill) || 0,
      connectionName: payload.connectionName || 'Self',
      propertyType: payload.propertyType || 'Residential',
      ownership: payload.ownership || 'Owned',
      propertyAddress: payload.propertyAddress || payload.address,
      landDetails: payload.landDetails || '',
      rooftopArea: Number(payload.rooftopArea) || 0,
      roofType: payload.roofType || 'RCC',

      // Documents & GPS Photo
      documents: {
        aadhaarCard: payload.documents?.aadhaarCard || { collected: false },
        panCard: payload.documents?.panCard || { collected: false },
        bijliBill: payload.documents?.bijliBill || { collected: false },
        bankPassbook: payload.documents?.bankPassbook || { collected: false },
        jaminRasid: payload.documents?.jaminRasid || { collected: false },
        rooftopGpsPhoto: payload.documents?.rooftopGpsPhoto || {
          collected: false,
          capturedWithGps: true,
          gpsLatitude: '26.9124° N',
          gpsLongitude: '75.7873° E',
        },
      },

      // Declaration & Signatures
      declarationAccepted: payload.declarationAccepted !== false,
      applicantSignature: payload.applicantSignature || '',
      executiveSignature: payload.executiveSignature || '',

      // Office Verification
      verification: {
        status: 'Pending',
        remarks: '',
      },
    };

    let savedRecord;
    if (dbConnected) {
      savedRecord = await Application.create(newRecord);
      registrationCounter++;
    } else {
      savedRecord = { _id: 'rec_' + Date.now(), ...newRecord, createdAt: new Date() };
      inMemoryRegistrations.unshift(savedRecord);
    }

    res.status(201).json({
      success: true,
      message: `Registration ${regId} recorded successfully!`,
      registration: savedRecord,
    });
  } catch (err) {
    console.error('Registration save error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to submit registration' });
  }
});

// ---------------------------------------------------------------------------
// 4. Submission Log (Section 9) & Registrations Listing
// ---------------------------------------------------------------------------
app.get('/api/submission-log', async (req, res) => {
  try {
    const { status, search } = req.query;
    let list = [];

    if (dbConnected) {
      const filter = {};
      if (status && status !== 'ALL') {
        filter['verification.status'] = status;
      }
      if (search) {
        filter.$or = [
          { registrationId: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } },
          { consumerNo: { $regex: search, $options: 'i' } },
          { districtCity: { $regex: search, $options: 'i' } },
        ];
      }
      list = await Application.find(filter).sort({ createdAt: -1 });
    } else {
      list = [...inMemoryRegistrations];
      if (status && status !== 'ALL') {
        list = list.filter((r) => r.verification?.status === status);
      }
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(
          (r) =>
            r.registrationId?.toLowerCase().includes(q) ||
            r.fullName?.toLowerCase().includes(q) ||
            r.mobile?.includes(q)
        );
      }
    }

    // Format as Submission Log according to Booklet Table
    const formattedLog = list.map((item) => {
      // Calculate Docs OK (Aadhaar, PAN, Bill, Bank, Jamin)
      const docs = item.documents || {};
      const requiredDocs = [
        docs.aadhaarCard?.collected,
        docs.bijliBill?.collected,
        docs.bankPassbook?.collected,
      ];
      const docsOk = requiredDocs.every(Boolean);
      const gpsPhotoOk = Boolean(docs.rooftopGpsPhoto?.collected);

      return {
        _id: item._id,
        registrationId: item.registrationId,
        applicantName: item.fullName,
        mobile: item.mobile,
        districtCity: item.districtCity,
        consumerNo: item.consumerNo,
        avgMonthlyBill: item.avgMonthlyBill,
        executiveName: item.executiveName,
        submissionMode: item.submissionMode,
        docsOk: docsOk,
        gpsPhoto: gpsPhotoOk,
        sentOn: item.createdAt || item.issuedOn,
        verificationStatus: item.verification?.status || 'Pending',
        verificationRemarks: item.verification?.remarks || '',
        raw: item,
      };
    });

    res.json({
      success: true,
      count: formattedLog.length,
      submissionLog: formattedLog,
    });
  } catch (err) {
    console.error('Fetch submission log error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch submission log' });
  }
});

// ---------------------------------------------------------------------------
// 5. Single Registration Details (For Tear-Off Slip / Verification)
// ---------------------------------------------------------------------------
app.get('/api/registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let record;
    if (dbConnected) {
      record = await Application.findOne({
        $or: [{ registrationId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
    } else {
      record = inMemoryRegistrations.find((r) => r.registrationId === id || r._id === id);
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Registration record not found' });
    }

    res.json({ success: true, registration: record });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving registration' });
  }
});

// ---------------------------------------------------------------------------
// 6. Office Verification (Section 7)
// ---------------------------------------------------------------------------
app.patch('/api/registrations/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, verifiedBy } = req.body;

    let updated;
    if (dbConnected) {
      const doc = await Application.findOne({
        $or: [{ registrationId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });

      if (!doc) {
        return res.status(404).json({ success: false, message: 'Record not found' });
      }

      doc.verification = {
        status: status || doc.verification?.status || 'Done',
        remarks: remarks !== undefined ? remarks : doc.verification?.remarks,
        verifiedAt: new Date(),
        verifiedBy: verifiedBy || 'Office Verification Officer',
      };
      await doc.save();
      updated = doc;
    } else {
      const idx = inMemoryRegistrations.findIndex((r) => r.registrationId === id || r._id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Record not found' });
      }
      inMemoryRegistrations[idx].verification = {
        status: status || 'Done',
        remarks: remarks || '',
        verifiedAt: new Date(),
        verifiedBy: verifiedBy || 'Office Verification Officer',
      };
      updated = inMemoryRegistrations[idx];
    }

    res.json({
      success: true,
      message: `Verification updated for ${updated.registrationId}`,
      registration: updated,
    });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ success: false, message: 'Verification update failed' });
  }
});

// ---------------------------------------------------------------------------
// 6b. Update & Delete Registration (Admin Control)
// ---------------------------------------------------------------------------
app.put('/api/registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    let updatedDoc;
    if (dbConnected) {
      updatedDoc = await Application.findOneAndUpdate(
        { $or: [{ registrationId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }] },
        { $set: updates },
        { new: true }
      );
    } else {
      const idx = inMemoryRegistrations.findIndex((r) => r.registrationId === id || r._id === id);
      if (idx !== -1) {
        inMemoryRegistrations[idx] = { ...inMemoryRegistrations[idx], ...updates, updatedAt: new Date() };
        updatedDoc = inMemoryRegistrations[idx];
      }
    }

    if (!updatedDoc) {
      return res.status(404).json({ success: false, message: 'Application record not found' });
    }

    res.json({
      success: true,
      message: `Application ${updatedDoc.registrationId || id} updated successfully`,
      registration: updatedDoc,
    });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update application' });
  }
});

app.delete('/api/registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let deleted = false;

    if (dbConnected) {
      const result = await Application.findOneAndDelete({
        $or: [{ registrationId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      deleted = !!result;
    } else {
      const prevLen = inMemoryRegistrations.length;
      inMemoryRegistrations = inMemoryRegistrations.filter(
        (r) => r.registrationId !== id && r._id !== id
      );
      deleted = inMemoryRegistrations.length < prevLen;
    }

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Record not found to delete' });
    }

    res.json({ success: true, message: `Application ${id} deleted successfully` });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete application' });
  }
});

// ---------------------------------------------------------------------------
// 6c. Users Management (Admin Control)
// ---------------------------------------------------------------------------
app.get('/api/users', async (req, res) => {
  try {
    let usersList = [];
    if (dbConnected) {
      usersList = await User.find({}, '-password').sort({ createdAt: -1 });
    } else {
      usersList = (typeof inMemoryUsers !== 'undefined' ? inMemoryUsers : []).map(u => {
        const { password, ...safe } = u;
        return safe;
      });
    }

    res.json({ success: true, users: usersList });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (dbConnected) {
      await User.findByIdAndDelete(id);
    }
    res.json({ success: true, message: 'User removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove user' });
  }
});

// ---------------------------------------------------------------------------
// 6d. Live Tracking for Applicants / Field Staff (Mobile / Reg ID / Consumer No)
// ---------------------------------------------------------------------------
app.get('/api/registrations/track/:query', async (req, res) => {
  try {
    const rawQuery = (req.params.query || '').trim();
    if (!rawQuery) {
      return res.status(400).json({ success: false, message: 'Please provide a Mobile Number or Registration ID.' });
    }

    let records = [];
    if (dbConnected) {
      records = await Application.find({
        $or: [
          { registrationId: { $regex: '^' + rawQuery + '$', $options: 'i' } },
          { mobile: rawQuery },
          { consumerNo: rawQuery },
        ],
      }).sort({ createdAt: -1 });
    } else {
      const q = rawQuery.toLowerCase();
      records = inMemoryRegistrations.filter(
        (r) =>
          r.registrationId?.toLowerCase() === q ||
          r.mobile === rawQuery ||
          r.consumerNo === rawQuery
      );
    }

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No application found matching "${rawQuery}". Please check the details and try again.`,
      });
    }

    res.json({
      success: true,
      count: records.length,
      records,
    });
  } catch (err) {
    console.error('Track error:', err);
    res.status(500).json({ success: false, message: 'Server error while tracking application.' });
  }
});

// ---------------------------------------------------------------------------
// 7. System Stats
// ---------------------------------------------------------------------------
app.get('/api/stats', async (req, res) => {
  try {
    let list = [];
    if (dbConnected) {
      list = await Application.find();
    } else {
      list = inMemoryRegistrations;
    }

    const total = list.length;
    const pending = list.filter((r) => !r.verification?.status || r.verification?.status === 'Pending').length;
    const verified = list.filter((r) => ['Done', 'Verified', 'Approved'].includes(r.verification?.status)).length;
    const rejected = list.filter((r) => r.verification?.status === 'Rejected').length;
    const docsComplete = list.filter(
      (r) =>
        r.documents?.aadhaarCard?.collected &&
        r.documents?.bijliBill?.collected &&
        r.documents?.rooftopGpsPhoto?.collected
    ).length;

    // Estimated capacity
    const totalKw = list.reduce((acc, curr) => {
      const bill = curr.avgMonthlyBill || 0;
      const units = bill / 7.5;
      const kw = Math.max(1, Math.round((units / 120) * 10) / 10);
      return acc + kw;
    }, 0);

    // Total estimated subsidy in Lakhs
    const totalSubsidyLakhs = list.reduce((acc, curr) => {
      const bill = curr.avgMonthlyBill || 0;
      const units = bill / 7.5;
      const kw = Math.max(1, Math.round((units / 120) * 10) / 10);
      let sub = 78000;
      if (kw <= 1.2) sub = 30000;
      else if (kw <= 2.2) sub = 60000;
      return acc + (sub / 100000);
    }, 0);

    res.json({
      success: true,
      stats: {
        total,
        pending,
        done: verified,
        verified,
        rejected,
        docsComplete,
        totalKw: Math.round(totalKw * 10) / 10,
        totalSubsidyLakhs: Math.round(totalSubsidyLakhs * 10) / 10,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Stats error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 SolarConnect Digital Registration System running on http://localhost:${PORT}`);
});
