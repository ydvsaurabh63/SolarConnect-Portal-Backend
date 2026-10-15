require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const Application = require('./models/Application');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solarconnect';

// Super Admin credentials from .env
const SUPERADMIN_EMAIL = (process.env.SUPERADMIN_EMAIL || 'superadmin@solar.com').toLowerCase().trim();
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'admin123';

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '25mb' }));
let dbConnected = false;
let inMemoryRegistrations = [];
let registrationCounter = 1;

// Default Seed Users for All System Roles with Hierarchical Lineage
const seedUsers = [
  {
    _id: 'seed_superadmin_01',
    fullName: 'GetSolarConnect',
    email: SUPERADMIN_EMAIL,
    mobile: '9876500001',
    password: SUPERADMIN_PASSWORD,
    role: 'superadmin',
    executiveId: 'SA-01',
    code: 'SA-01',
    companyName: 'GetSolarConnect',
    territory: 'National',
  },
  {
    _id: 'seed_admin_01',
    fullName: 'Vijay Kumar Singh',
    email: 'admin@solar.com',
    mobile: '9876500002',
    password: 'admin123',
    role: 'admin',
    executiveId: 'ADM-101',
    code: 'ADM-101',
    createdById: 'seed_superadmin_01',
    createdByName: 'GetSolarConnect',
    companyName: 'Vijay Kumar Singh Solar Operations',
    territory: 'Delhi NCR & North Zone',
  },
  {
    _id: 'seed_distributor_01',
    fullName: 'Nandani Enterprise',
    email: 'distributor@solar.com',
    mobile: '9876500003',
    password: 'distributor123',
    role: 'distributor',
    executiveId: 'DST-101-01',
    code: 'DST-101-01',
    adminId: 'seed_admin_01',
    adminName: 'Vijay Kumar Singh',
    adminCode: 'ADM-101',
    createdById: 'seed_admin_01',
    createdByName: 'Vijay Kumar Singh',
    companyName: 'Nandani Enterprise',
    territory: 'North Delhi Region',
    verificationMode: 'MANUAL',
    assignedPartnerId: 'seed_partner_01',
    assignedPartnerName: 'Solarize',
    assignedFinancerId: 'seed_financer_01',
    assignedFinancerName: 'SBI',
  },
  {
    _id: 'seed_agent_01',
    fullName: 'Rakesh',
    email: 'agent@solar.com',
    mobile: '9876500004',
    password: 'agent123',
    role: 'agent',
    executiveId: 'AGT-101-01-01',
    code: 'AGT-101-01-01',
    distributorId: 'seed_distributor_01',
    distributorName: 'Nandani Enterprise',
    distributorCode: 'DST-101-01',
    adminId: 'seed_admin_01',
    adminName: 'Vijay Kumar Singh',
    adminCode: 'ADM-101',
    createdById: 'seed_distributor_01',
    createdByName: 'Nandani Enterprise',
    territory: 'Sector 15, Rohini',
  },
  {
    _id: 'seed_partner_01',
    fullName: 'Solarize',
    email: 'partner@solar.com',
    mobile: '9876500005',
    password: 'partner123',
    role: 'partner',
    executiveId: 'PRT-101-01',
    code: 'PRT-101-01',
    adminId: 'seed_admin_01',
    adminName: 'Vijay Kumar Singh',
    adminCode: 'ADM-101',
    companyName: 'Solarize',
    territory: 'Delhi NCR',
  },
  {
    _id: 'seed_financer_01',
    fullName: 'SBI',
    email: 'financer@solar.com',
    mobile: '9876500006',
    password: 'bank123',
    role: 'financer',
    executiveId: 'FIN-101-01',
    code: 'FIN-101-01',
    adminId: 'seed_admin_01',
    adminName: 'Vijay Kumar Singh',
    adminCode: 'ADM-101',
    companyName: 'State Bank of India (SBI)',
  },
  {
    _id: 'seed_installer_01',
    fullName: 'Neha Solar',
    email: 'installer@solar.com',
    mobile: '9876500007',
    password: 'install123',
    role: 'installer',
    executiveId: 'INS-101-01-01',
    code: 'INS-101-01-01',
    createdById: 'seed_partner_01',
    createdByName: 'Solarize',
    adminId: 'seed_admin_01',
    adminName: 'Vijay Kumar Singh',
    adminCode: 'ADM-101',
    companyName: 'Neha Solar',
    territory: 'Delhi NCR',
  },
  {
    _id: 'seed_consumer_01',
    fullName: 'Anil Kumar',
    email: 'consumer@solar.com',
    mobile: '9876543210',
    consumerNo: 'CA-101-01-01-001',
    registrationId: 'SC-101-01-01-001',
    password: 'Anil@3210',
    role: 'user',
    executiveId: 'USR-101-01-01-001',
    code: 'USR-101-01-01-001',
    agentId: 'seed_agent_01',
    agentName: 'Rakesh',
    agentCode: 'AGT-101-01-01',
    distributorId: 'seed_distributor_01',
    distributorName: 'Nandani Enterprise',
    distributorCode: 'DST-101-01',
    adminId: 'seed_admin_01',
    adminName: 'Vijay Kumar Singh',
    adminCode: 'ADM-101',
    territory: 'Rohini Sector 15, New Delhi',
  },
];

let inMemoryUsers = [...seedUsers];

// Seed sample application in memory
const seedSampleApplication = {
  _id: 'sample_app_01',
  registrationId: 'SC-101-01-01-001',
  userCode: 'USR-101-01-01-001',
  executiveName: 'Rakesh',
  executiveId: 'AGT-101-01-01',
  areaDistrict: 'Rohini, North Delhi',
  issuedOn: new Date(),
  submissionMode: 'FIELD_EXECUTIVE',
  agentId: 'seed_agent_01',
  agentName: 'Rakesh',
  agentCode: 'AGT-101-01-01',
  distributorId: 'seed_distributor_01',
  distributorName: 'Nandani Enterprise',
  distributorCode: 'DST-101-01',
  adminId: 'seed_admin_01',
  adminName: 'Vijay Kumar Singh',
  adminCode: 'ADM-101',
  fullName: 'Anil Kumar',
  mobile: '9876543210',
  alternateNo: '9811223344',
  email: 'consumer@solar.com',
  address: 'Plot 42, Pocket B-4, Sector 15, Rohini',
  districtCity: 'North Delhi',
  pinCode: '110085',
  consumerNo: 'CA-101-01-01-001',
  avgMonthlyBill: 4200,
  connectionName: 'Self',
  propertyType: 'Residential',
  ownership: 'Owned',
  propertyAddress: 'Plot 42, Pocket B-4, Sector 15, Rohini, New Delhi',
  rooftopArea: 480,
  roofType: 'RCC',
  aadhaarNumber: '7829-4455-8910',
  panNumber: 'ABCDE9876K',
  landDetails: 'Khasra Deed #104/12, Pocket B-4 Rohini Registry Copy',
  bankDetails: {
    accountNumber: '5010045892314',
    ifscCode: 'HDFC0000123',
    bankName: 'HDFC Bank, Rohini Sector 15 Branch',
  },
  documents: {
    aadhaarCard: { collected: true, fileName: 'aadhaar_anil.pdf', frontPhoto: 'available', backPhoto: 'available' },
    panCard: { collected: true, fileName: 'pan_anil.pdf', photo: 'available' },
    bijliBill: { collected: true, fileName: 'tpdld_bill_aug.pdf', photo: 'available' },
    bankPassbook: { collected: true, fileName: 'sbi_passbook.pdf', photo: 'available' },
    jaminRasid: { collected: true, fileName: 'registry_copy.pdf', photo: 'available' },
    rooftopGpsPhoto: {
      collected: true,
      capturedWithGps: true,
      gpsLatitude: '28.7155° N',
      gpsLongitude: '77.1292° E',
      fileName: 'rooftop_geo.jpg',
      photo: 'available',
    },
  },
  declarationAccepted: true,
  applicantSignature: 'Anil Kumar',
  executiveSignature: 'Rakesh',
  verification: {
    status: 'Verified',
    verifiedAt: new Date(),
    verifiedBy: 'Vijay Kumar Singh',
    remarks: 'Documents verified and sanctioned load matches. Forwarded to Partner for EPC check.',
  },
  partnerDetails: {
    partnerId: 'seed_partner_01',
    partnerName: 'Solarize',
    status: 'Feasibility_Approved',
    assignedAt: new Date(),
    feasibilityNotes: 'Site feasible for 3.3 kW rooftop solar installation. RCC shadow-free roof verified.',
  },
  financingDetails: {
    required: true,
    financerId: 'seed_financer_01',
    financerName: 'SBI',
    status: 'Approved',
    loanAmount: 110000,
    remarks: 'PM Surya Ghar green loan pre-approved. 7% subsidized interest rate sanctioned.',
  },
  installerDetails: {
    installerId: 'seed_installer_01',
    installerName: 'Neha Solar',
    installerPhone: '9876500007',
    status: 'Assigned',
    assignedAt: new Date(),
    completedAt: null,
    serialNumbers: 'INV-2026-SOL-9981 / PNL-540W-01to06',
    proofPhoto: '',
  },
  consumerAccount: {
    loginId: 'consumer@solar.com',
    email: 'consumer@solar.com',
    userCode: 'USR-101-01-01-001',
    tempPassword: 'Anil@3210',
    accountCreatedAt: new Date(),
  },
  paymentDetails: {
    amount: 500,
    mode: 'UPI',
    transactionId: 'UPI-984210488219',
    paymentScreenshotUrl: 'https://pub-679fd7a2693d4211847ce4d1930bea61.r2.dev/documents/payment_proof.jpg',
    receiptNumber: 'REC-SC-101-01-01-001',
    paymentDate: new Date(),
    collectedByAgentName: 'Rakesh',
    collectedByAgentId: 'AGT-101-01-01',
  },
  createdAt: new Date(),
};

inMemoryRegistrations.push(seedSampleApplication);

// Seed into MongoDB helper
const seedMongoData = async () => {
  try {
    for (const u of seedUsers) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create(u);
      } else {
        exists.fullName = u.fullName;
        exists.companyName = u.companyName;
        exists.code = u.code;
        exists.executiveId = u.code;
        if (u.adminId) exists.adminId = u.adminId;
        if (u.adminName) exists.adminName = u.adminName;
        if (u.adminCode) exists.adminCode = u.adminCode;
        if (u.distributorId) exists.distributorId = u.distributorId;
        if (u.distributorName) exists.distributorName = u.distributorName;
        if (u.distributorCode) exists.distributorCode = u.distributorCode;
        if (u.agentId) exists.agentId = u.agentId;
        if (u.agentName) exists.agentName = u.agentName;
        if (u.agentCode) exists.agentCode = u.agentCode;
        if (u.assignedPartnerId) exists.assignedPartnerId = u.assignedPartnerId;
        if (u.assignedPartnerName) exists.assignedPartnerName = u.assignedPartnerName;
        if (u.assignedFinancerId) exists.assignedFinancerId = u.assignedFinancerId;
        if (u.assignedFinancerName) exists.assignedFinancerName = u.assignedFinancerName;
        if (u.createdByName) exists.createdByName = u.createdByName;
        if (u.consumerNo) exists.consumerNo = u.consumerNo;
        if (u.registrationId) exists.registrationId = u.registrationId;
        if (u.role === 'superadmin') exists.password = SUPERADMIN_PASSWORD;
        await exists.save();
      }
    }
    const appExists = await Application.findOne({
      $or: [{ registrationId: 'SC-101-01-01-001' }, { registrationId: 'SC-0001' }],
    });
    if (!appExists) {
      await Application.create(seedSampleApplication);
    } else {
      appExists.registrationId = 'SC-101-01-01-001';
      appExists.userCode = 'USR-101-01-01-001';
      appExists.executiveId = 'AGT-101-01-01';
      appExists.agentCode = 'AGT-101-01-01';
      appExists.distributorCode = 'DST-101-01';
      appExists.adminCode = 'ADM-101';
      appExists.consumerNo = 'CA-101-01-01-001';
      appExists.executiveName = 'Rakesh';
      appExists.agentName = 'Rakesh';
      appExists.distributorName = 'Nandani Enterprise';
      appExists.adminName = 'Vijay Kumar Singh';
      if (appExists.partnerDetails) appExists.partnerDetails.partnerName = 'Solarize';
      if (appExists.financingDetails) appExists.financingDetails.financerName = 'SBI';
      if (appExists.installerDetails) appExists.installerDetails.installerName = 'Neha Solar';
      if (appExists.paymentDetails) appExists.paymentDetails.collectedByAgentName = 'Rakesh';
      await appExists.save();
    }
    const count = await Application.countDocuments();
    registrationCounter = count + 1;
  } catch (err) {
    console.warn('Seed mongo warning:', err.message);
  }
};

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
  .then(async () => {
    dbConnected = true;
    console.log('✅ Connected to MongoDB successfully.');
    await seedMongoData();
  })
  .catch((err) => {
    dbConnected = false;
    console.warn('⚠️ MongoDB connection offline, running in-memory fallback:', err.message);
  });

// ---------------------------------------------------------------------------
// 4-Tier Hierarchical Unique ID & Lineage Generator Functions
// ---------------------------------------------------------------------------
// Look up user by MongoDB _id, code, executiveId, or email
const findUserByIdOrCode = async (idOrCode) => {
  if (!idOrCode) return null;
  if (dbConnected) {
    try {
      if (mongoose.Types.ObjectId.isValid(idOrCode)) {
        const byId = await User.findById(idOrCode).lean();
        if (byId) return byId;
      }
      return await User.findOne({
        $or: [
          { _id: idOrCode },
          { executiveId: idOrCode },
          { code: idOrCode },
          { email: idOrCode.toLowerCase() },
        ],
      }).lean();
    } catch (e) {
      return null;
    }
  } else {
    return (
      inMemoryUsers.find(
        (u) =>
          u._id === idOrCode ||
          u.executiveId === idOrCode ||
          u.code === idOrCode ||
          u.email?.toLowerCase() === idOrCode.toLowerCase()
      ) || null
    );
  }
};

// Helper: Query application by MongoDB _id (string or ObjectId) or registrationId
const buildAppQuery = (id) => {
  if (!id) return { _id: null };
  const or = [
    { _id: id },
    { registrationId: id },
  ];
  if (mongoose.Types.ObjectId.isValid(id)) {
    try {
      or.push({ _id: new mongoose.Types.ObjectId(id) });
    } catch (e) {}
  }
  return { $or: or };
};

// 1. Admin Code Generator: ADM-101, ADM-102, ...
const generateAdminCode = async () => {
  const users = dbConnected
    ? await User.find({ role: 'admin' }).lean()
    : inMemoryUsers.filter((u) => u.role === 'admin');
  let maxSeq = 100;
  for (const u of users) {
    const c = u.code || u.executiveId || '';
    const match = c.match(/ADM-(\d+)/i);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val > maxSeq) maxSeq = val;
    }
  }
  return `ADM-${maxSeq + 1}`;
};

// 2. Distributor Code Generator: DST-[AdminRoot]-[Seq], e.g. DST-101-01, DST-101-02
const generateDistributorCode = async (adminCode = 'ADM-101') => {
  const matchAdmin = (adminCode || '').match(/ADM-(\d+)/i);
  const adminSuffix = matchAdmin ? matchAdmin[1] : '101';

  const users = dbConnected
    ? await User.find({ role: 'distributor' }).lean()
    : inMemoryUsers.filter((u) => u.role === 'distributor');
  let maxSeq = 0;
  const pattern = new RegExp(`^DST-${adminSuffix}-(\\d+)`, 'i');
  for (const u of users) {
    const c = u.code || u.executiveId || '';
    const m = c.match(pattern);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val > maxSeq) maxSeq = val;
    }
  }
  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  return `DST-${adminSuffix}-${nextSeq}`;
};

// 3. Agent Code Generator: AGT-[DistributorRoot]-[Seq], e.g. AGT-101-01-01
const generateAgentCode = async (distributorCode = 'DST-101-01') => {
  const matchDist = (distributorCode || '').match(/DST-([0-9-]+)/i);
  const distSuffix = matchDist ? matchDist[1] : '101-01';

  const users = dbConnected
    ? await User.find({ role: { $in: ['agent', 'executive'] } }).lean()
    : inMemoryUsers.filter((u) => u.role === 'agent' || u.role === 'executive');
  let maxSeq = 0;
  const pattern = new RegExp(`^AGT-${distSuffix}-(\\d+)`, 'i');
  for (const u of users) {
    const c = u.code || u.executiveId || '';
    const m = c.match(pattern);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val > maxSeq) maxSeq = val;
    }
  }
  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  return `AGT-${distSuffix}-${nextSeq}`;
};

// 4. Consumer Codes Generator: USR-[AgentRoot]-[Seq], SC-[AgentRoot]-[Seq], CA-[AgentRoot]-[Seq]
const generateConsumerCodes = async (agentCode = 'AGT-101-01-01') => {
  const matchAgent = (agentCode || '').match(/AGT-([0-9-]+)/i);
  const agentSuffix = matchAgent
    ? matchAgent[1]
    : agentCode
    ? agentCode.replace(/[^0-9-]/g, '') || '101-01-01'
    : '101-01-01';
  const safeAgentSuffix = agentSuffix || '101-01-01';

  const apps = dbConnected ? await Application.find({}).lean() : inMemoryRegistrations;
  const users = dbConnected
    ? await User.find({ role: 'user' }).lean()
    : inMemoryUsers.filter((u) => u.role === 'user');

  let maxSeq = 0;
  const patternApp = new RegExp(`^SC-${safeAgentSuffix}-(\\d+)`, 'i');
  for (const a of apps) {
    const regId = a.registrationId || '';
    const m = regId.match(patternApp);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val > maxSeq) maxSeq = val;
    }
  }

  const patternUser = new RegExp(`^USR-${safeAgentSuffix}-(\\d+)`, 'i');
  for (const u of users) {
    const c = u.code || u.executiveId || '';
    const m = c.match(patternUser);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val > maxSeq) maxSeq = val;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return {
    userCode: `USR-${safeAgentSuffix}-${nextSeq}`,
    registrationId: `SC-${safeAgentSuffix}-${nextSeq}`,
    defaultConsumerNo: `CA-${safeAgentSuffix}-${nextSeq}`,
  };
};

// 5. Partner Code (PRT-[adminSuffix]-[seq])
const generatePartnerCode = async (adminCode = 'ADM-101') => {
  const matchAdmin = (adminCode || '').match(/ADM-(\d+)/i);
  const adminSuffix = matchAdmin ? matchAdmin[1] : '101';
  const users = dbConnected
    ? await User.find({ role: 'partner' }).lean()
    : inMemoryUsers.filter((u) => u.role === 'partner');
  let maxSeq = 0;
  const pattern = new RegExp(`^PRT-${adminSuffix}-(\\d+)`, 'i');
  for (const u of users) {
    const c = u.code || u.executiveId || '';
    const m = c.match(pattern);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val > maxSeq) maxSeq = val;
    }
  }
  return `PRT-${adminSuffix}-${String(maxSeq + 1).padStart(2, '0')}`;
};

// 6. Financer Code (FIN-[adminSuffix]-[seq])
const generateFinancerCode = async (adminCode = 'ADM-101') => {
  const matchAdmin = (adminCode || '').match(/ADM-(\d+)/i);
  const adminSuffix = matchAdmin ? matchAdmin[1] : '101';
  const users = dbConnected
    ? await User.find({ role: 'financer' }).lean()
    : inMemoryUsers.filter((u) => u.role === 'financer');
  let maxSeq = 0;
  const pattern = new RegExp(`^FIN-${adminSuffix}-(\\d+)`, 'i');
  for (const u of users) {
    const c = u.code || u.executiveId || '';
    const m = c.match(pattern);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val > maxSeq) maxSeq = val;
    }
  }
  return `FIN-${adminSuffix}-${String(maxSeq + 1).padStart(2, '0')}`;
};

// 7. Installer Code (INS-[partnerSuffix]-[seq])
const generateInstallerCode = async (partnerCode = 'PRT-101-01') => {
  const matchPrt = (partnerCode || '').match(/PRT-([0-9-]+)/i);
  const prtSuffix = matchPrt ? matchPrt[1] : '101-01';
  const users = dbConnected
    ? await User.find({ role: 'installer' }).lean()
    : inMemoryUsers.filter((u) => u.role === 'installer');
  let maxSeq = 0;
  const pattern = new RegExp(`^INS-${prtSuffix}-(\\d+)`, 'i');
  for (const u of users) {
    const c = u.code || u.executiveId || '';
    const m = c.match(pattern);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val > maxSeq) maxSeq = val;
    }
  }
  return `INS-${prtSuffix}-${String(maxSeq + 1).padStart(2, '0')}`;
};

// Next Registration ID helper (backward compatible)
const getNextSequentialRegId = async (agentCode = 'AGT-101-01-01') => {
  const codes = await generateConsumerCodes(agentCode);
  return codes.registrationId;
};

// ---------------------------------------------------------------------------
// 1. Health & Next ID API
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'SolarConnect Unified Multi-Tier Platform',
    scheme: 'PM Surya Ghar: Muft Bijli Yojana',
    version: '2.0',
    database: dbConnected ? 'MongoDB Connected' : 'In-Memory Fallback',
    superadminEmail: SUPERADMIN_EMAIL,
    timestamp: new Date(),
  });
});

app.get('/api/next-id', async (req, res) => {
  try {
    const { agentCode } = req.query;
    const codes = await generateConsumerCodes(agentCode || 'AGT-101-01-01');
    res.json({
      success: true,
      nextId: codes.registrationId,
      nextConsumerNo: codes.defaultConsumerNo,
      nextUserCode: codes.userCode,
    });
  } catch (err) {
    res.json({
      success: true,
      nextId: 'SC-101-01-01-001',
      nextConsumerNo: 'CA-101-01-01-001',
      nextUserCode: 'USR-101-01-01-001',
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Authentication (Unified for All Roles & Consumers)
// ---------------------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const loginIdentifier = (email || '').toLowerCase().trim();

    if (!loginIdentifier) {
      return res.status(400).json({ success: false, message: 'Email, Mobile or Consumer ID is required.' });
    }

    // 1. Check if user is Super Admin defined in .env
    if (loginIdentifier === SUPERADMIN_EMAIL) {
      if (password !== SUPERADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: 'Incorrect password for Super Admin.' });
      }
      const superUser = {
        _id: 'seed_superadmin_01',
        fullName: 'GetSolarConnect',
        email: SUPERADMIN_EMAIL,
        mobile: '9876500001',
        role: 'superadmin',
        executiveId: 'SA-01',
        companyName: 'GetSolarConnect',
        territory: 'National',
      };
      return res.json({
        success: true,
        message: 'Welcome back, GetSolarConnect!',
        user: superUser,
      });
    }

    // 2. Check other users in database or memory
    let user = null;

    if (dbConnected) {
      user = await User.findOne({
        $or: [
          { email: loginIdentifier },
          { mobile: loginIdentifier },
          { consumerNo: { $regex: new RegExp(`^${loginIdentifier}$`, 'i') } },
          { registrationId: { $regex: new RegExp(`^${loginIdentifier}$`, 'i') } },
        ],
      });
    } else {
      user = inMemoryUsers.find((u) => {
        const uEmail = (u.email || '').toLowerCase();
        const uMob = (u.mobile || '').toLowerCase();
        const uCons = (u.consumerNo || '').toLowerCase();
        const uReg = (u.registrationId || '').toLowerCase();
        return (
          uEmail === loginIdentifier ||
          uMob === loginIdentifier ||
          uCons === loginIdentifier ||
          uReg === loginIdentifier
        );
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found matching this identifier. Please verify your credentials.',
      });
    }

    // Role check if specific portal route sent a required role
    if (role && role !== 'all') {
      const roleMap = { executive: 'agent', agent: 'agent' };
      const userRoleNormalized = roleMap[user.role] || user.role;
      const expectedRoleNormalized = roleMap[role] || role;

      if (userRoleNormalized !== expectedRoleNormalized && user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: `Access denied. This login is for ${role.toUpperCase()} portal, but your account role is ${user.role.toUpperCase()}.`,
        });
      }
    }

    // Password validation
    if (password && user.password && user.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    }

    user.lastLogin = new Date();
    if (dbConnected) await user.save();

    const { password: _, ...userSafe } = user.toObject ? user.toObject() : user;

    res.json({
      success: true,
      message: `Welcome back, ${user.fullName}!`,
      user: userSafe,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// 2b. Impersonate / "Login As" (Top-Down Only)
app.post('/api/auth/impersonate', async (req, res) => {
  try {
    const { targetUserId, requesterRole } = req.body;
    if (!targetUserId || !requesterRole) {
      return res.status(400).json({ success: false, message: 'targetUserId and requesterRole are required.' });
    }

    let targetUser = null;
    if (dbConnected) {
      targetUser = await User.findById(targetUserId);
    } else {
      targetUser = inMemoryUsers.find((u) => u._id === targetUserId);
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }

    // STRICT TOP-DOWN RULES
    // 1. Super Admin can impersonate: Admin, Distributor, Partner, Financer, Agent, Installer, User
    // 2. Admin can impersonate: Distributor, Partner, Financer
    // 3. Distributor can impersonate: Agent
    // 4. Partner can impersonate: Installer
    // 5. Agent, Financer, Installer, User CANNOT impersonate anyone!
    const allowed =
      (requesterRole === 'superadmin' && ['admin', 'distributor', 'partner', 'financer', 'agent', 'installer', 'user'].includes(targetUser.role)) ||
      (requesterRole === 'admin' && ['distributor', 'partner', 'financer'].includes(targetUser.role)) ||
      (requesterRole === 'distributor' && ['agent', 'executive'].includes(targetUser.role)) ||
      (requesterRole === 'partner' && ['installer'].includes(targetUser.role));

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: `Security Access Denied: A ${requesterRole.toUpperCase()} cannot login as a ${targetUser.role.toUpperCase()}. Hierarchy flows top-down only.`,
      });
    }

    const { password: _, ...safe } = targetUser.toObject ? targetUser.toObject() : targetUser;
    res.json({
      success: true,
      message: `Impersonation authorized. Switching to ${targetUser.fullName} (${targetUser.role.toUpperCase()})`,
      user: {
        ...safe,
        isImpersonated: true,
        impersonatedBy: requesterRole,
      },
    });
  } catch (err) {
    console.error('Impersonate error:', err);
    res.status(500).json({ success: false, message: 'Impersonation request failed.' });
  }
});

// ---------------------------------------------------------------------------
// 3. User Hierarchy Management & Full CRUD
// ---------------------------------------------------------------------------
app.get('/api/users', async (req, res) => {
  try {
    const { role, createdById } = req.query;
    let list = [];

    if (dbConnected) {
      const filter = {};
      if (role && role !== 'ALL') filter.role = role;
      if (createdById) filter.createdById = createdById;
      list = await User.find(filter).sort({ createdAt: -1 });
    } else {
      list = inMemoryUsers.filter((u) => {
        if (role && role !== 'ALL' && u.role !== role) return false;
        if (createdById && u.createdById !== createdById) return false;
        return true;
      });
    }

    res.json({ success: true, users: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const {
      fullName,
      email,
      mobile,
      password,
      role = 'agent',
      companyName,
      territory,
      createdById,
      createdByName,
      adminId,
      adminName,
      adminCode,
      distributorId,
      distributorName,
      distributorCode,
      agentId,
      agentName,
      agentCode,
      partnerId,
      consumerNo,
    } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ success: false, message: 'Full name and email are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check duplicate email
    let emailExists = false;
    if (dbConnected) {
      emailExists = await User.findOne({ email: cleanEmail });
    } else {
      emailExists = inMemoryUsers.find((u) => u.email === cleanEmail);
    }
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    let finalCode = '';
    let finalAdminId = adminId || '';
    let finalAdminName = adminName || '';
    let finalAdminCode = adminCode || '';
    let finalDistributorId = distributorId || '';
    let finalDistributorName = distributorName || '';
    let finalDistributorCode = distributorCode || '';
    let finalAgentId = agentId || '';
    let finalAgentName = agentName || '';
    let finalAgentCode = agentCode || '';
    let finalConsumerNo = consumerNo || '';
    let finalRegId = '';

    if (role === 'admin') {
      finalCode = await generateAdminCode();
      finalAdminCode = finalCode;
      finalAdminName = fullName;
    } else if (role === 'distributor') {
      let parentAdmin = await findUserByIdOrCode(adminId || createdById);
      if (!parentAdmin) {
        parentAdmin = dbConnected
          ? await User.findOne({ role: 'admin' }).lean()
          : inMemoryUsers.find((u) => u.role === 'admin');
      }
      finalAdminId = parentAdmin?._id || 'seed_admin_01';
      finalAdminName = parentAdmin?.fullName || 'Vijay Kumar Singh';
      finalAdminCode = parentAdmin?.code || parentAdmin?.executiveId || 'ADM-101';

      finalCode = await generateDistributorCode(finalAdminCode);
      finalDistributorCode = finalCode;
      finalDistributorName = fullName;
    } else if (role === 'agent' || role === 'executive') {
      let parentDist = await findUserByIdOrCode(distributorId || createdById);
      if (!parentDist) {
        parentDist = dbConnected
          ? await User.findOne({ role: 'distributor' }).lean()
          : inMemoryUsers.find((u) => u.role === 'distributor');
      }
      finalDistributorId = parentDist?._id || 'seed_distributor_01';
      finalDistributorName = parentDist?.fullName || 'Nandani Enterprise';
      finalDistributorCode = parentDist?.code || parentDist?.executiveId || 'DST-101-01';

      finalAdminId = parentDist?.adminId || finalAdminId || 'seed_admin_01';
      finalAdminName = parentDist?.adminName || finalAdminName || 'Vijay Kumar Singh';
      finalAdminCode = parentDist?.adminCode || finalAdminCode || 'ADM-101';

      finalCode = await generateAgentCode(finalDistributorCode);
      finalAgentCode = finalCode;
      finalAgentName = fullName;
    } else if (role === 'partner') {
      let parentAdmin = await findUserByIdOrCode(adminId || createdById);
      if (!parentAdmin) {
        parentAdmin = dbConnected
          ? await User.findOne({ role: 'admin' }).lean()
          : inMemoryUsers.find((u) => u.role === 'admin');
      }
      finalAdminId = parentAdmin?._id || 'seed_admin_01';
      finalAdminName = parentAdmin?.fullName || 'Vijay Kumar Singh';
      finalAdminCode = parentAdmin?.code || parentAdmin?.executiveId || 'ADM-101';

      finalCode = await generatePartnerCode(finalAdminCode);
    } else if (role === 'financer') {
      let parentAdmin = await findUserByIdOrCode(adminId || createdById);
      if (!parentAdmin) {
        parentAdmin = dbConnected
          ? await User.findOne({ role: 'admin' }).lean()
          : inMemoryUsers.find((u) => u.role === 'admin');
      }
      finalAdminId = parentAdmin?._id || 'seed_admin_01';
      finalAdminName = parentAdmin?.fullName || 'Vijay Kumar Singh';
      finalAdminCode = parentAdmin?.code || parentAdmin?.executiveId || 'ADM-101';

      finalCode = await generateFinancerCode(finalAdminCode);
    } else if (role === 'installer') {
      let parentPartner = await findUserByIdOrCode(partnerId || createdById);
      if (!parentPartner) {
        parentPartner = dbConnected
          ? await User.findOne({ role: 'partner' }).lean()
          : inMemoryUsers.find((u) => u.role === 'partner');
      }
      const partnerCode = parentPartner?.code || parentPartner?.executiveId || 'PRT-101-01';
      finalCode = await generateInstallerCode(partnerCode);
      finalAdminId = parentPartner?.adminId || 'seed_admin_01';
      finalAdminName = parentPartner?.adminName || 'Vijay Kumar Singh';
      finalAdminCode = parentPartner?.adminCode || 'ADM-101';
    } else if (role === 'user') {
      let parentAgent = await findUserByIdOrCode(agentId || createdById);
      if (!parentAgent) {
        parentAgent = dbConnected
          ? await User.findOne({ role: { $in: ['agent', 'executive'] } }).lean()
          : inMemoryUsers.find((u) => u.role === 'agent' || u.role === 'executive');
      }
      finalAgentId = parentAgent?._id || '';
      finalAgentName = parentAgent?.fullName || '';
      finalAgentCode = parentAgent?.code || parentAgent?.executiveId || 'AGT-101-01-01';

      finalDistributorId = parentAgent?.distributorId || '';
      finalDistributorName = parentAgent?.distributorName || '';
      finalDistributorCode = parentAgent?.distributorCode || '';

      finalAdminId = parentAgent?.adminId || '';
      finalAdminName = parentAgent?.adminName || '';
      finalAdminCode = parentAgent?.adminCode || '';

      const generated = await generateConsumerCodes(finalAgentCode);
      finalCode = generated.userCode;
      finalRegId = generated.registrationId;
      finalConsumerNo = consumerNo || generated.defaultConsumerNo;
    }

    const userData = {
      fullName,
      email: cleanEmail,
      mobile: mobile || '',
      password: password || 'solar@123',
      role: role || 'agent',
      companyName: companyName || '',
      territory: territory || '',
      code: finalCode,
      executiveId: finalCode,
      createdById: createdById || '',
      createdByName: createdByName || '',
      adminId: finalAdminId,
      adminName: finalAdminName,
      adminCode: finalAdminCode,
      distributorId: finalDistributorId,
      distributorName: finalDistributorName,
      distributorCode: finalDistributorCode,
      agentId: finalAgentId,
      agentName: finalAgentName,
      agentCode: finalAgentCode,
      consumerNo: finalConsumerNo,
      registrationId: finalRegId,
    };

    if (dbConnected) {
      const newUser = await User.create(userData);
      return res.status(201).json({
        success: true,
        user: newUser,
        message: `New ${role} created successfully with Unique ID: ${finalCode}!`,
      });
    } else {
      const newUser = {
        _id: 'user_' + Date.now(),
        ...userData,
        createdAt: new Date(),
      };
      inMemoryUsers.push(newUser);
      return res.status(201).json({
        success: true,
        user: newUser,
        message: `New ${role} created successfully with Unique ID: ${finalCode}!`,
      });
    }
  } catch (err) {
    console.error('Error in /api/users POST:', err);
    res.status(500).json({ success: false, message: 'Error creating user: ' + err.message });
  }
});

// Update User (Full CRUD: Name, Email, Mobile, Password, Territory, Company)
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, mobile, password, territory, companyName, verificationMode, assignedPartnerId, assignedPartnerName, assignedFinancerId, assignedFinancerName } = req.body;

    const updates = {};
    if (fullName) updates.fullName = fullName.trim();
    if (email) updates.email = email.toLowerCase().trim();
    if (mobile !== undefined) updates.mobile = mobile.trim();
    if (password) updates.password = password; // Editable password!
    if (territory !== undefined) updates.territory = territory.trim();
    if (companyName !== undefined) updates.companyName = companyName.trim();
    if (verificationMode) updates.verificationMode = verificationMode === 'AUTO' ? 'AUTO' : 'MANUAL';
    if (assignedPartnerId !== undefined) updates.assignedPartnerId = assignedPartnerId;
    if (assignedPartnerName !== undefined) updates.assignedPartnerName = assignedPartnerName;
    if (assignedFinancerId !== undefined) updates.assignedFinancerId = assignedFinancerId;
    if (assignedFinancerName !== undefined) updates.assignedFinancerName = assignedFinancerName;

    if (dbConnected) {
      const updated = await User.findByIdAndUpdate(id, { $set: updates }, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: 'User not found' });

      // Automatically sync updated names across all related survey applications
      if (updates.fullName) {
        if (updated.role === 'agent' || updated.role === 'executive') {
          await Application.updateMany(
            { $or: [{ agentId: id }, { executiveId: updated.code || updated.executiveId }] },
            { $set: { agentName: updates.fullName, executiveName: updates.fullName } }
          );
        } else if (updated.role === 'distributor') {
          await Application.updateMany(
            { $or: [{ distributorId: id }, { distributorCode: updated.code || updated.executiveId }] },
            { $set: { distributorName: updates.fullName } }
          );
        } else if (updated.role === 'partner') {
          await Application.updateMany(
            { 'partnerDetails.partnerId': id },
            { $set: { 'partnerDetails.partnerName': updates.fullName } }
          );
        } else if (updated.role === 'admin') {
          await Application.updateMany(
            { $or: [{ adminId: id }, { adminCode: updated.code || updated.executiveId }] },
            { $set: { adminName: updates.fullName } }
          );
        }
      }

      return res.json({ success: true, message: 'User updated successfully!', user: updated });
    } else {
      const idx = inMemoryUsers.findIndex((u) => u._id === id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'User not found' });
      inMemoryUsers[idx] = { ...inMemoryUsers[idx], ...updates };

      // In-memory sync across applications
      if (updates.fullName) {
        const u = inMemoryUsers[idx];
        inMemoryRegistrations.forEach((r) => {
          if (u.role === 'agent' && (r.agentId === id || r.executiveId === u.code)) {
            r.agentName = updates.fullName;
            r.executiveName = updates.fullName;
          } else if (u.role === 'distributor' && (r.distributorId === id || r.distributorCode === u.code)) {
            r.distributorName = updates.fullName;
          } else if (u.role === 'partner' && r.partnerDetails?.partnerId === id) {
            r.partnerDetails.partnerName = updates.fullName;
          }
        });
      }

      return res.json({ success: true, message: 'User updated successfully!', user: inMemoryUsers[idx] });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (dbConnected) {
      await User.findByIdAndDelete(id);
    } else {
      inMemoryUsers = inMemoryUsers.filter((u) => u._id !== id);
    }
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
});

// Reset or Update Consumer/User password upon request by Agent / Distributor / Admin
app.post('/api/users/reset-consumer-password', async (req, res) => {
  try {
    const { identifier, newPassword } = req.body;
    if (!identifier || !newPassword) {
      return res.status(400).json({ success: false, message: 'Identifier (Consumer No, Mobile or Reg ID) and new password are required.' });
    }

    const trimmedId = identifier.trim();
    const cleanPass = newPassword.trim();

    if (dbConnected) {
      const user = await User.findOne({
        role: 'user',
        $or: [
          { consumerNo: trimmedId },
          { mobile: trimmedId },
          { registrationId: trimmedId },
          { code: trimmedId },
        ],
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'Consumer account not found for this identifier.' });
      }

      user.password = cleanPass;
      await user.save();

      // Also update the linked Application record's consumerAccount
      await Application.updateMany(
        { $or: [{ consumerNo: user.consumerNo }, { registrationId: user.registrationId }] },
        { $set: { 'consumerAccount.tempPassword': cleanPass } }
      );

      return res.json({
        success: true,
        message: `Password updated successfully for Consumer ${user.fullName} (${user.consumerNo})!`,
        consumerNo: user.consumerNo,
        newPassword: cleanPass,
      });
    } else {
      const u = inMemoryUsers.find(
        (x) =>
          x.role === 'user' &&
          (x.consumerNo === trimmedId || x.mobile === trimmedId || x.registrationId === trimmedId || x.code === trimmedId)
      );

      if (!u) {
        return res.status(404).json({ success: false, message: 'Consumer account not found.' });
      }

      u.password = cleanPass;

      inMemoryRegistrations.forEach((r) => {
        if (r.consumerNo === u.consumerNo || r.registrationId === u.registrationId) {
          if (!r.consumerAccount) r.consumerAccount = {};
          r.consumerAccount.tempPassword = cleanPass;
        }
      });

      return res.json({
        success: true,
        message: `Password updated successfully for Consumer ${u.fullName} (${u.consumerNo})!`,
        consumerNo: u.consumerNo,
        newPassword: cleanPass,
      });
    }
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
});

// ---------------------------------------------------------------------------
// 3b. Cloudflare R2 Document & Image Uploads
// ---------------------------------------------------------------------------
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB file limit
});
const { uploadToR2, isR2Configured, bucketName } = require('./r2Storage');

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided for upload.' });
    }

    const folder = req.body.folder || 'documents';
    const result = await uploadToR2({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      folder,
    });

    res.json({
      success: true,
      message: 'File uploaded successfully.',
      fileUrl: result.url,
      fileName: result.fileName,
      key: result.key,
      storage: result.storage,
      isR2Configured,
    });
  } catch (err) {
    console.error('Error in /api/upload:', err);
    res.status(500).json({ success: false, message: err.message || 'File upload failed.' });
  }
});

// ---------------------------------------------------------------------------
// 4. Application Submissions (Agent & Consumer)
// ---------------------------------------------------------------------------
app.post('/api/registrations', async (req, res) => {
  try {
    const payload = req.body;

    // 1. Identify onboarding Agent & Full Hierarchy Lineage
    let parentAgent = await findUserByIdOrCode(payload.agentId || payload.executiveId || payload.createdById);
    if (!parentAgent && payload.submissionMode === 'FIELD_EXECUTIVE') {
      parentAgent = dbConnected
        ? await User.findOne({ role: { $in: ['agent', 'executive'] } }).lean()
        : inMemoryUsers.find((u) => u.role === 'agent' || u.role === 'executive');
    }

    const agentCode = parentAgent ? (parentAgent.code || parentAgent.executiveId || 'AGT-101-01-01') : 'ONLINE';
    const agentId = parentAgent ? parentAgent._id : (payload.agentId || '');
    const agentName = parentAgent ? parentAgent.fullName : (payload.executiveName || 'Direct Field Agent');

    let distributorId = parentAgent?.distributorId || payload.distributorId || '';
    let distributorName = parentAgent?.distributorName || payload.distributorName || '';
    let distributorCode = parentAgent?.distributorCode || payload.distributorCode || '';

    let adminId = parentAgent?.adminId || payload.adminId || '';
    let adminName = parentAgent?.adminName || payload.adminName || '';
    let adminCode = parentAgent?.adminCode || payload.adminCode || '';

    // If distributor info was missing on agent, look up distributor
    if (!distributorCode && distributorId) {
      const dist = await findUserByIdOrCode(distributorId);
      if (dist) {
        distributorCode = dist.code || dist.executiveId || 'DST-101-01';
        distributorName = dist.fullName;
        if (!adminId) {
          adminId = dist.adminId || '';
          adminName = dist.adminName || '';
          adminCode = dist.adminCode || '';
        }
      }
    }

    if (!distributorCode) distributorCode = 'DST-101-01';
    if (!adminCode) adminCode = 'ADM-101';

    // 2. Generate Hierarchical Unique Consumer Codes rooted in Onboarding Agent
    const generatedCodes = await generateConsumerCodes(agentCode);
    const regId = payload.registrationId && !payload.registrationId.startsWith('SC-000')
      ? payload.registrationId
      : generatedCodes.registrationId;

    const userCode = generatedCodes.userCode;
    const finalConsumerNo = payload.consumerNo || generatedCodes.defaultConsumerNo;
    const consumerEmail = (payload.email || '').toLowerCase().trim();
    const cleanMobile = String(payload.mobile || '').replace(/\D/g, '');
    const last4Mobile = cleanMobile.slice(-4) || '1234';

    // Strict Rule: Login ID = User's Email (fallback to mobile email if empty)
    const consumerLoginId = consumerEmail || `${cleanMobile || 'user'}@solar.com`;

    // Strict Rule: Password = <FirstName>@<Last4DigitsOfMobile>
    const rawFirstName = (payload.fullName || 'User').trim().split(/\s+/)[0];
    const firstName = rawFirstName ? (rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase()) : 'User';
    const consumerPass = `${firstName}@${last4Mobile}`;

    const newRecord = {
      registrationId: regId,
      userCode: userCode,
      executiveName: agentName,
      executiveId: agentCode,
      areaDistrict: payload.areaDistrict || payload.districtCity || 'Default District',
      issuedOn: new Date(),
      submissionMode: payload.submissionMode || 'FIELD_EXECUTIVE',

      agentId: agentId,
      agentName: agentName,
      agentCode: agentCode,
      distributorId: distributorId,
      distributorName: distributorName,
      distributorCode: distributorCode,
      adminId: adminId,
      adminName: adminName,
      adminCode: adminCode,

      fullName: payload.fullName,
      mobile: payload.mobile,
      alternateNo: payload.alternateNo || '',
      email: payload.email || '',
      address: payload.address,
      districtCity: payload.districtCity,
      pinCode: payload.pinCode,

      // Specific Identification Numbers
      aadhaarNumber: payload.aadhaarNumber || '',
      panNumber: payload.panNumber || '',
      bankDetails: {
        accountNumber: payload.accountNumber || payload.bankDetails?.accountNumber || '',
        ifscCode: payload.ifscCode || payload.bankDetails?.ifscCode || '',
        bankName: payload.bankName || payload.bankDetails?.bankName || '',
      },

      consumerNo: finalConsumerNo,
      avgMonthlyBill: Number(payload.avgMonthlyBill) || 0,
      connectionName: payload.connectionName || 'Self',
      propertyType: payload.propertyType || 'Residential',
      ownership: payload.ownership || 'Owned',
      propertyAddress: payload.propertyAddress || payload.address,
      landDetails: payload.landDetails || '',
      rooftopArea: Number(payload.rooftopArea) || 0,
      roofType: payload.roofType || 'RCC',

      documents: {
        aadhaarCard: payload.documents?.aadhaarCard || { collected: false },
        panCard: payload.documents?.panCard || { collected: false },
        bijliBill: payload.documents?.bijliBill || { collected: false },
        bankPassbook: payload.documents?.bankPassbook || { collected: false },
        jaminRasid: payload.documents?.jaminRasid || { collected: false },
        rooftopGpsPhoto: payload.documents?.rooftopGpsPhoto || {
          collected: false,
          capturedWithGps: true,
          gpsLatitude: '28.6139° N',
          gpsLongitude: '77.2090° E',
        },
      },

      declarationAccepted: payload.declarationAccepted !== false,
      applicantSignature: payload.applicantSignature || '',
      executiveSignature: payload.executiveSignature || '',

      // Multi-Tier Verification Workflow
      overallStatus: 'Pending_Distributor',
      distributorVerification: {
        status: 'Pending',
        verifiedAt: null,
        verifiedBy: '',
        rejectionReason: '',
      },
      adminVerification: {
        status: 'Pending',
        verifiedAt: null,
        verifiedBy: '',
        rejectionReason: '',
      },
      verification: {
        status: 'Pending',
        remarks: 'New survey submitted by Field Agent. Pending Distributor verification.',
      },

      partnerDetails: {
        partnerId: '',
        partnerName: '',
        status: 'Unassigned',
      },

      financingDetails: {
        required: payload.financingRequired === true,
        financerId: '',
        financerName: '',
        status: payload.financingRequired ? 'Pending' : 'Not_Required',
        loanAmount: 0,
      },

      installerDetails: {
        installerId: '',
        installerName: '',
        installerPhone: '',
        status: 'Unassigned',
      },

      consumerAccount: {
        customerName: payload.fullName,
        loginId: consumerLoginId,
        email: consumerLoginId,
        consumerNo: finalConsumerNo,
        userCode: userCode,
        tempPassword: consumerPass,
        accountCreatedAt: new Date(),
      },

      paymentDetails: {
        amount: Number(payload.paymentAmount) || 500,
        mode: payload.paymentMode || 'UPI',
        transactionId: payload.paymentTransactionId || payload.transactionId || 'UPI-APP-RECORD',
        paymentScreenshotUrl: payload.paymentScreenshotUrl || '',
        receiptNumber: `REC-${regId}`,
        paymentDate: new Date(),
        collectedByAgentName: agentName,
        collectedByAgentId: agentCode,
      },
    };

    const consumerAccountData = {
      fullName: payload.fullName,
      email: consumerLoginId,
      mobile: payload.mobile,
      consumerNo: finalConsumerNo,
      registrationId: regId,
      code: userCode,
      executiveId: userCode,
      agentId: agentId,
      agentName: agentName,
      agentCode: agentCode,
      distributorId: distributorId,
      distributorName: distributorName,
      distributorCode: distributorCode,
      adminId: adminId,
      adminName: adminName,
      adminCode: adminCode,
      password: consumerPass,
      role: 'user',
      territory: payload.districtCity || '',
    };

    const responseAccount = {
      customerName: payload.fullName,
      loginId: consumerLoginId,
      email: consumerLoginId,
      consumerNo: finalConsumerNo,
      userCode: userCode,
      tempPassword: consumerPass,
    };

    if (dbConnected) {
      const saved = await Application.create(newRecord);
      registrationCounter++;
      try {
        await User.findOneAndUpdate(
          { $or: [{ email: consumerLoginId }, { mobile: payload.mobile }, { registrationId: regId }] },
          { $set: consumerAccountData },
          { upsert: true, new: true }
        );
      } catch (e) {
        console.warn('User upsert warning:', e.message);
      }
      return res.status(201).json({
        success: true,
        message: `Registration ${regId} successfully submitted! Unique Consumer Code: ${userCode}`,
        registration: saved,
        consumerAccount: responseAccount,
      });
    } else {
      const saved = { _id: 'rec_' + Date.now(), ...newRecord, createdAt: new Date() };
      inMemoryRegistrations.unshift(saved);
      const existingUserIdx = inMemoryUsers.findIndex(u => (consumerLoginId && u.email === consumerLoginId) || (payload.mobile && u.mobile === payload.mobile));
      if (existingUserIdx >= 0) {
        inMemoryUsers[existingUserIdx] = { ...inMemoryUsers[existingUserIdx], ...consumerAccountData };
      } else {
        inMemoryUsers.push({ _id: 'usr_' + Date.now(), ...consumerAccountData, createdAt: new Date() });
      }

      return res.status(201).json({
        success: true,
        message: `Registration ${regId} successfully submitted! Unique Consumer Code: ${userCode}`,
        registration: saved,
        consumerAccount: responseAccount,
      });
    }
  } catch (err) {
    console.error('Error in /api/registrations POST:', err);
    res.status(500).json({ success: false, message: 'Server error saving application.' });
  }
});

// Quick connection lead from landing page
app.post('/api/quick-connection', async (req, res) => {
  try {
    const { fullName, mobile, state, district, avgBill, roofArea } = req.body;
    if (!fullName || !mobile) {
      return res.status(400).json({ success: false, message: 'Full name and mobile are required.' });
    }

    const regId = await getNextSequentialRegId();
    const consumerPass = 'solar@123';
    const consumerLoginId = mobile;

    const quickRecord = {
      registrationId: regId,
      executiveName: 'Online Direct Lead',
      executiveId: 'EX-ONLINE',
      areaDistrict: district || state || 'Direct Lead',
      issuedOn: new Date(),
      submissionMode: 'SELF_APPLICANT',
      fullName,
      mobile,
      address: `${district || ''}, ${state || ''}`,
      districtCity: district || 'Direct City',
      pinCode: '000000',
      consumerNo: 'LEAD-' + mobile.slice(-4),
      avgMonthlyBill: Number(avgBill) || 2500,
      connectionName: 'Self',
      propertyType: 'Residential',
      ownership: 'Owned',
      propertyAddress: `${district || ''}, ${state || ''}`,
      rooftopArea: Number(roofArea) || 300,
      roofType: 'RCC',
      documents: {
        aadhaarCard: { collected: false },
        panCard: { collected: false },
        bijliBill: { collected: false },
        bankPassbook: { collected: false },
        jaminRasid: { collected: false },
        rooftopGpsPhoto: { collected: false },
      },
      verification: {
        status: 'Pending',
        remarks: 'Direct online lead from website. Awaiting field agent allocation.',
      },
      partnerDetails: { status: 'Unassigned' },
      financingDetails: { status: 'Not_Required' },
      installerDetails: { status: 'Unassigned' },
      consumerAccount: {
        loginId: consumerLoginId,
        tempPassword: consumerPass,
        accountCreatedAt: new Date(),
      },
    };

    if (dbConnected) {
      const saved = await Application.create(quickRecord);
      registrationCounter++;
      return res.status(201).json({ success: true, message: 'Lead submitted!', registration: saved });
    } else {
      const saved = { _id: 'rec_' + Date.now(), ...quickRecord, createdAt: new Date() };
      inMemoryRegistrations.unshift(saved);
      return res.status(201).json({ success: true, message: 'Lead submitted!', registration: saved });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error submitting lead.' });
  }
});

// ---------------------------------------------------------------------------
// 5. Application Queries
// ---------------------------------------------------------------------------
app.get('/api/submission-log', async (req, res) => {
  try {
    const { status, search, role, userId, agentId, distributorId, partnerId, installerId } = req.query;

    let list = [];
    if (dbConnected) {
      const filter = {};
      if (status && status !== 'ALL') filter['verification.status'] = status;
      if (agentId) {
        filter.$or = [
          { agentId: agentId },
          { agentCode: agentId },
          { executiveId: agentId },
        ];
      }
      if (distributorId) filter.distributorId = distributorId;
      if (partnerId) filter['partnerDetails.partnerId'] = partnerId;
      if (installerId) filter['installerDetails.installerId'] = installerId;

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        const searchConditions = [
          { registrationId: searchRegex },
          { fullName: searchRegex },
          { mobile: searchRegex },
          { consumerNo: searchRegex },
          { districtCity: searchRegex },
        ];
        if (filter.$or) {
          filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
          delete filter.$or;
        } else {
          filter.$or = searchConditions;
        }
      }
      list = await Application.find(filter).sort({ createdAt: -1 });
    } else {
      list = inMemoryRegistrations.filter((r) => {
        if (status && status !== 'ALL' && r.verification?.status !== status) return false;
        if (agentId && r.agentId !== agentId && r.agentCode !== agentId && r.executiveId !== agentId) return false;
        if (distributorId && r.distributorId !== distributorId) return false;
        if (partnerId && r.partnerDetails?.partnerId !== partnerId) return false;
        if (installerId && r.installerDetails?.installerId !== installerId) return false;

        if (search) {
          const s = search.toLowerCase();
          const match =
            (r.registrationId && r.registrationId.toLowerCase().includes(s)) ||
            (r.fullName && r.fullName.toLowerCase().includes(s)) ||
            (r.mobile && r.mobile.toLowerCase().includes(s)) ||
            (r.consumerNo && r.consumerNo.toLowerCase().includes(s)) ||
            (r.districtCity && r.districtCity.toLowerCase().includes(s));
          if (!match) return false;
        }
        return true;
      });
    }

    res.json({ success: true, count: list.length, records: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch application records.' });
  }
});

app.get('/api/registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let rec = null;
    if (dbConnected) {
      rec = await Application.findOne(buildAppQuery(id));
    } else {
      rec = inMemoryRegistrations.find((r) => r._id === id || r.registrationId === id);
    }
    if (!rec) return res.status(404).json({ success: false, message: 'Application not found.' });
    res.json({ success: true, registration: rec });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving application.' });
  }
});

app.put('/api/registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatePayload = req.body;

    let appRecord = null;
    if (dbConnected) {
      appRecord = await Application.findOne(buildAppQuery(id));
    } else {
      appRecord = inMemoryRegistrations.find((r) => r._id === id || r.registrationId === id);
    }

    if (!appRecord) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const updatedBy = updatePayload.updatedBy || 'Agent / Consumer';
    const existingDocs = appRecord.documents?.toObject ? appRecord.documents.toObject() : (appRecord.documents || {});
    const mergedDocs = { ...existingDocs };

    if (updatePayload.documents) {
      for (const [k, v] of Object.entries(updatePayload.documents)) {
        if (v) {
          mergedDocs[k] = {
            ...(mergedDocs[k] || {}),
            ...v,
            status: 'Pending', // reset rejection status on newly uploaded or updated doc
            remarks: '',
            collected: true,
          };
        }
      }
    }

    // Reset status to Pending_Distributor on re-submission so distributor can audit again
    const resetData = {
      ...updatePayload,
      documents: mergedDocs,
      overallStatus: 'Pending_Distributor',
      'verification.status': 'Pending',
      'verification.remarks': `Re-submitted by ${updatedBy} with corrected survey details / documents.`,
      'distributorVerification.status': 'Pending',
      'distributorVerification.rejectionReason': '',
      'adminVerification.status': 'Pending',
      'adminVerification.rejectionReason': '',
      updatedAt: new Date(),
    };

    if (dbConnected) {
      const updated = await Application.findOneAndUpdate(
        { _id: appRecord._id },
        { $set: resetData },
        { new: true }
      );
      return res.json({ success: true, message: 'Application updated and re-submitted to Distributor Desk.', registration: updated });
    } else {
      Object.assign(appRecord, resetData);
      return res.json({ success: true, message: 'Application updated and re-submitted to Distributor Desk.', registration: appRecord });
    }
  } catch (err) {
    console.error('Error in PUT /api/registrations/:id:', err);
    res.status(500).json({ success: false, message: 'Failed to update application.' });
  }
});

// ---------------------------------------------------------------------------
// 5b. System Settings (Verification Mode & Distributor-Partner Mapping)
// ---------------------------------------------------------------------------
let systemSettings = {
  verificationMode: 'MANUAL', // 'MANUAL' | 'AUTO'
  distributorPartnerMapping: {
    seed_distributor_01: {
      partnerId: 'seed_partner_01',
      partnerName: 'Solarize',
      partnerCode: 'PRT-101-01',
      financerId: 'seed_financer_01',
      financerName: 'SBI',
      financerCode: 'FIN-101-01',
    },
  },
};

app.get('/api/settings', (req, res) => {
  res.json({ success: true, settings: systemSettings });
});

app.post('/api/settings', (req, res) => {
  try {
    const { verificationMode, distributorPartnerMapping } = req.body;
    if (verificationMode) {
      systemSettings.verificationMode = verificationMode === 'AUTO' ? 'AUTO' : 'MANUAL';
    }
    if (distributorPartnerMapping) {
      systemSettings.distributorPartnerMapping = {
        ...systemSettings.distributorPartnerMapping,
        ...distributorPartnerMapping,
      };
    }
    res.json({
      success: true,
      message: `System settings saved. Mode: ${systemSettings.verificationMode}`,
      settings: systemSettings,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update settings.' });
  }
});

// ---------------------------------------------------------------------------
// 5c. Multi-Tier Verification Handlers (Distributor & Admin Verification)
// ---------------------------------------------------------------------------
// 1. Distributor Verification Handler
app.post('/api/registrations/:id/distributor-verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remarks, rejectionReason, verifiedBy } = req.body;

    let appRecord = null;
    if (dbConnected) {
      appRecord = await Application.findOne(buildAppQuery(id));
    } else {
      appRecord = inMemoryRegistrations.find((r) => r._id === id || r.registrationId === id);
    }

    if (!appRecord) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const isReject = action === 'REJECT';
    const reasonText = rejectionReason || remarks || 'Documents incomplete or unclear';

    if (isReject) {
      // Distributor Rejection
      const updateData = {
        'distributorVerification.status': 'Rejected',
        'distributorVerification.rejectionReason': reasonText,
        'distributorVerification.verifiedBy': verifiedBy || 'Distributor Desk',
        'distributorVerification.verifiedAt': new Date(),
        overallStatus: 'Rejected_By_Distributor',
        'verification.status': 'Rejected',
        'verification.remarks': reasonText,
      };

      if (req.body.documentAudits) {
        for (const [docKey, auditVal] of Object.entries(req.body.documentAudits)) {
          if (auditVal && auditVal.status) {
            updateData[`documents.${docKey}.status`] = auditVal.status;
            if (auditVal.remarks) {
              updateData[`documents.${docKey}.remarks`] = auditVal.remarks;
            }
          }
        }
      }

      if (dbConnected) {
        const updated = await Application.findOneAndUpdate(
          { _id: appRecord._id },
          { $set: updateData },
          { new: true }
        );
        return res.json({
          success: true,
          message: 'Application rejected by Distributor. Rejection notice sent to Agent and Consumer.',
          record: updated,
        });
      } else {
        Object.assign(appRecord, {
          distributorVerification: {
            status: 'Rejected',
            rejectionReason: reasonText,
            verifiedBy: verifiedBy || 'Distributor Desk',
            verifiedAt: new Date(),
          },
          overallStatus: 'Rejected_By_Distributor',
          verification: {
            ...appRecord.verification,
            status: 'Rejected',
            remarks: reasonText,
          },
        });
        if (req.body.documentAudits && appRecord.documents) {
          for (const [docKey, auditVal] of Object.entries(req.body.documentAudits)) {
            if (appRecord.documents[docKey] && auditVal) {
              appRecord.documents[docKey].status = auditVal.status || 'Needs_Correction';
              if (auditVal.remarks) appRecord.documents[docKey].remarks = auditVal.remarks;
            }
          }
        }
        return res.json({
          success: true,
          message: 'Application rejected by Distributor. Rejection notice sent to Agent and Consumer.',
          record: appRecord,
        });
      }
    } else {
      // Check Distributor-specific automation setting, or fallback to global system settings
      let distributorUser = null;
      if (appRecord.distributorId) {
        if (dbConnected) {
          distributorUser = await User.findById(appRecord.distributorId);
        } else {
          distributorUser = inMemoryUsers.find((u) => u._id === appRecord.distributorId);
        }
      }

      const isAuto = distributorUser?.verificationMode
        ? distributorUser.verificationMode === 'AUTO'
        : systemSettings.verificationMode === 'AUTO';

      if (isAuto) {
        // AUTO MODE: Automatically assign mapped Partner & Financer and dispatch
        const distKey = appRecord.distributorId || 'seed_distributor_01';
        const partnerId = distributorUser?.assignedPartnerId || systemSettings.distributorPartnerMapping[distKey]?.partnerId || 'seed_partner_01';
        const partnerName = distributorUser?.assignedPartnerName || systemSettings.distributorPartnerMapping[distKey]?.partnerName || 'Solarize';
        const financerId = distributorUser?.assignedFinancerId || systemSettings.distributorPartnerMapping[distKey]?.financerId || 'seed_financer_01';
        const financerName = distributorUser?.assignedFinancerName || systemSettings.distributorPartnerMapping[distKey]?.financerName || 'SBI';

        const updateData = {
          'distributorVerification.status': 'Verified',
          'distributorVerification.verifiedBy': verifiedBy || 'Distributor Desk',
          'distributorVerification.verifiedAt': new Date(),
          'adminVerification.status': 'Approved',
          'adminVerification.verifiedBy': 'Fast-Track Auto Verification Engine',
          'adminVerification.verifiedAt': new Date(),
          overallStatus: 'Assigned_To_Partner',
          'verification.status': 'Approved',
          'verification.remarks': `Auto-verified via Distributor Hub. Dispatched to Partner: ${partnerName}`,
          'partnerDetails.partnerId': partnerId,
          'partnerDetails.partnerName': partnerName,
          'partnerDetails.status': 'Assigned',
          'partnerDetails.assignedAt': new Date(),
          'financingDetails.financerId': financerId,
          'financingDetails.financerName': financerName,
          'financingDetails.status': 'Pending',
        };

        if (dbConnected) {
          const updated = await Application.findOneAndUpdate(
            { _id: appRecord._id },
            { $set: updateData },
            { new: true }
          );
          return res.json({
            success: true,
            message: `Verified and auto-dispatched to EPC Partner (${partnerName}) via Auto Mode!`,
            record: updated,
          });
        } else {
          Object.assign(appRecord, {
            distributorVerification: {
              status: 'Verified',
              verifiedBy: verifiedBy || 'Distributor Desk',
              verifiedAt: new Date(),
            },
            adminVerification: {
              status: 'Approved',
              verifiedBy: 'Fast-Track Auto Verification Engine',
              verifiedAt: new Date(),
            },
            overallStatus: 'Assigned_To_Partner',
            verification: {
              ...appRecord.verification,
              status: 'Approved',
              remarks: `Auto-verified via Distributor Hub. Dispatched to Partner: ${partnerName}`,
            },
            partnerDetails: {
              ...appRecord.partnerDetails,
              partnerId: partnerId,
              partnerName: partnerName,
              status: 'Assigned',
              assignedAt: new Date(),
            },
            financingDetails: {
              ...appRecord.financingDetails,
              financerId: financerId,
              financerName: financerName,
              status: 'Pending',
            },
          });
          return res.json({
            success: true,
            message: `Verified and auto-dispatched to EPC Partner (${partnerName}) via Auto Mode!`,
            record: appRecord,
          });
        }
      } else {
        // MANUAL MODE: Forward to Admin Desk for final sanction
        const updateData = {
          'distributorVerification.status': 'Verified',
          'distributorVerification.verifiedBy': verifiedBy || 'Distributor Desk',
          'distributorVerification.verifiedAt': new Date(),
          overallStatus: 'Distributor_Verified',
          'verification.status': 'Verified',
          'verification.remarks': 'Documents checked & verified by Distributor. Forwarded to Admin Desk for final sanction.',
        };

        if (dbConnected) {
          const updated = await Application.findOneAndUpdate(
            { _id: appRecord._id },
            { $set: updateData },
            { new: true }
          );
          return res.json({
            success: true,
            message: 'Application verified by Distributor and forwarded to Admin Desk for approval!',
            record: updated,
          });
        } else {
          Object.assign(appRecord, {
            distributorVerification: {
              status: 'Verified',
              verifiedBy: verifiedBy || 'Distributor Desk',
              verifiedAt: new Date(),
            },
            overallStatus: 'Distributor_Verified',
            verification: {
              ...appRecord.verification,
              status: 'Verified',
              remarks: 'Documents checked & verified by Distributor. Forwarded to Admin Desk for final sanction.',
            },
          });
          return res.json({
            success: true,
            message: 'Application verified by Distributor and forwarded to Admin Desk for approval!',
            record: appRecord,
          });
        }
      }
    }
  } catch (err) {
    console.error('Distributor verify error:', err);
    res.status(500).json({ success: false, message: 'Distributor verification failed: ' + err.message });
  }
});

// 2. Admin Verification Handler (Accept / Reject with Partner & Financer Assignment)
app.post('/api/registrations/:id/admin-verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remarks, rejectionReason, verifiedBy, partnerId, partnerName, financerId, financerName } = req.body;

    let appRecord = null;
    if (dbConnected) {
      appRecord = await Application.findOne(buildAppQuery(id));
    } else {
      appRecord = inMemoryRegistrations.find((r) => r._id === id || r.registrationId === id);
    }

    if (!appRecord) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const isReject = action === 'REJECT';
    const reasonText = rejectionReason || remarks || 'Sanction criteria not met';

    if (isReject) {
      // Admin Rejection
      const updateData = {
        'adminVerification.status': 'Rejected',
        'adminVerification.rejectionReason': reasonText,
        'adminVerification.verifiedBy': verifiedBy || 'Vijay Kumar Singh',
        'adminVerification.verifiedAt': new Date(),
        overallStatus: 'Rejected_By_Admin',
        'verification.status': 'Rejected',
        'verification.remarks': reasonText,
      };

      if (req.body.documentAudits) {
        for (const [docKey, auditVal] of Object.entries(req.body.documentAudits)) {
          if (auditVal && auditVal.status) {
            updateData[`documents.${docKey}.status`] = auditVal.status;
            if (auditVal.remarks) {
              updateData[`documents.${docKey}.remarks`] = auditVal.remarks;
            }
          }
        }
      }

      if (dbConnected) {
        const updated = await Application.findOneAndUpdate(
          { _id: appRecord._id },
          { $set: updateData },
          { new: true }
        );
        return res.json({
          success: true,
          message: 'Application rejected by Admin. Status updated across all portals.',
          record: updated,
        });
      } else {
        Object.assign(appRecord, {
          adminVerification: {
            status: 'Rejected',
            rejectionReason: reasonText,
            verifiedBy: verifiedBy || 'Vijay Kumar Singh',
            verifiedAt: new Date(),
          },
          overallStatus: 'Rejected_By_Admin',
          verification: {
            ...appRecord.verification,
            status: 'Rejected',
            remarks: reasonText,
          },
        });
        if (req.body.documentAudits && appRecord.documents) {
          for (const [docKey, auditVal] of Object.entries(req.body.documentAudits)) {
            if (appRecord.documents[docKey] && auditVal) {
              appRecord.documents[docKey].status = auditVal.status || 'Needs_Correction';
              if (auditVal.remarks) appRecord.documents[docKey].remarks = auditVal.remarks;
            }
          }
        }
        return res.json({
          success: true,
          message: 'Application rejected by Admin. Status updated across all portals.',
          record: appRecord,
        });
      }
    } else {
      // Admin Approval
      let distUser = null;
      if (appRecord.distributorId) {
        if (dbConnected) {
          distUser = await User.findById(appRecord.distributorId);
        } else {
          distUser = inMemoryUsers.find((u) => u._id === appRecord.distributorId);
        }
      }
      const distKey = appRecord.distributorId || 'seed_distributor_01';
      const mapped = systemSettings.distributorPartnerMapping[distKey] || {};

      const finalPartnerId = partnerId || distUser?.assignedPartnerId || mapped.partnerId || 'seed_partner_01';
      const finalPartnerName = partnerName || distUser?.assignedPartnerName || mapped.partnerName || 'Solarize';
      const finalFinancerId = financerId || distUser?.assignedFinancerId || mapped.financerId || 'seed_financer_01';
      const finalFinancerName = financerName || distUser?.assignedFinancerName || mapped.financerName || 'SBI';

      const updateData = {
        'adminVerification.status': 'Approved',
        'adminVerification.verifiedBy': verifiedBy || 'Vijay Kumar Singh',
        'adminVerification.verifiedAt': new Date(),
        overallStatus: 'Assigned_To_Partner',
        'verification.status': 'Approved',
        'verification.remarks': remarks || `Sanction approved by Admin. Assigned to Partner: ${finalPartnerName}`,
        'partnerDetails.partnerId': finalPartnerId,
        'partnerDetails.partnerName': finalPartnerName,
        'partnerDetails.status': 'Assigned',
        'partnerDetails.assignedAt': new Date(),
        'financingDetails.financerId': finalFinancerId,
        'financingDetails.financerName': finalFinancerName,
        'financingDetails.status': 'Pending',
      };

      if (dbConnected) {
        const updated = await Application.findOneAndUpdate(
          { _id: appRecord._id },
          { $set: updateData },
          { new: true }
        );
        return res.json({
          success: true,
          message: `Application approved by Admin and assigned to Partner (${finalPartnerName})!`,
          record: updated,
        });
      } else {
        Object.assign(appRecord, {
          adminVerification: {
            status: 'Approved',
            verifiedBy: verifiedBy || 'Vijay Kumar Singh',
            verifiedAt: new Date(),
          },
          overallStatus: 'Assigned_To_Partner',
          verification: {
            ...appRecord.verification,
            status: 'Approved',
            remarks: remarks || `Sanction approved by Admin. Assigned to Partner: ${finalPartnerName}`,
          },
          partnerDetails: {
            ...appRecord.partnerDetails,
            partnerId: finalPartnerId,
            partnerName: finalPartnerName,
            status: 'Assigned',
            assignedAt: new Date(),
          },
          financingDetails: {
            ...appRecord.financingDetails,
            financerId: finalFinancerId,
            financerName: finalFinancerName,
            status: 'Pending',
          },
        });
        return res.json({
          success: true,
          message: `Application approved by Admin and assigned to Partner (${finalPartnerName})!`,
          record: appRecord,
        });
      }
    }
  } catch (err) {
    console.error('Admin verify error:', err);
    res.status(500).json({ success: false, message: 'Admin verification failed: ' + err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. Workflow Actions (Status Updates for Hierarchy Stages)
// ---------------------------------------------------------------------------
app.patch('/api/registrations/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, verifiedBy } = req.body;

    const updateData = {
      'verification.status': status || 'Verified',
      'verification.remarks': remarks || '',
      'verification.verifiedBy': verifiedBy || 'Operations Admin',
      'verification.verifiedAt': new Date(),
    };

    if (dbConnected) {
      const rec = await Application.findOneAndUpdate(
        buildAppQuery(id),
        { $set: updateData },
        { new: true }
      );
      if (!rec) return res.status(404).json({ success: false, message: 'Record not found' });
      return res.json({ success: true, message: `Status updated to ${status}`, record: rec });
    } else {
      const idx = inMemoryRegistrations.findIndex((r) => r._id === id || r.registrationId === id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Record not found' });
      inMemoryRegistrations[idx].verification = {
        ...inMemoryRegistrations[idx].verification,
        status: status || 'Verified',
        remarks: remarks || '',
        verifiedBy: verifiedBy || 'Operations Admin',
        verifiedAt: new Date(),
      };
      return res.json({ success: true, message: `Status updated to ${status}`, record: inMemoryRegistrations[idx] });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification update failed.' });
  }
});

app.patch('/api/registrations/:id/assign-partner', async (req, res) => {
  try {
    const { id } = req.params;
    const { partnerId, partnerName } = req.body;

    const partnerUpdate = {
      'partnerDetails.partnerId': partnerId,
      'partnerDetails.partnerName': partnerName,
      'partnerDetails.status': 'Assigned',
      'partnerDetails.assignedAt': new Date(),
    };

    if (dbConnected) {
      const rec = await Application.findOneAndUpdate(
        buildAppQuery(id),
        { $set: partnerUpdate },
        { new: true }
      );
      return res.json({ success: true, message: `Application assigned to Partner ${partnerName}`, record: rec });
    } else {
      const idx = inMemoryRegistrations.findIndex((r) => r._id === id || r.registrationId === id);
      inMemoryRegistrations[idx].partnerDetails = {
        ...inMemoryRegistrations[idx].partnerDetails,
        partnerId,
        partnerName,
        status: 'Assigned',
        assignedAt: new Date(),
      };
      return res.json({ success: true, message: `Assigned to Partner ${partnerName}`, record: inMemoryRegistrations[idx] });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign partner.' });
  }
});

app.patch('/api/registrations/:id/partner-verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feasibilityNotes, documentAudits, rejectionReason, verifiedBy } = req.body;

    const isReject = status === 'Feasibility_Rejected' || status === 'Rejected';
    const finalStatus = isReject ? 'Feasibility_Rejected' : 'Feasibility_Approved';
    const overall = isReject ? 'Rejected_By_Partner' : 'Feasibility_Approved';

    const update = {
      'partnerDetails.status': finalStatus,
      'partnerDetails.feasibilityNotes': feasibilityNotes || rejectionReason || (isReject ? 'Rooftop unsuitable or structural constraint identified by Partner.' : 'Site feasible for rooftop solar installation.'),
      'partnerDetails.reviewedAt': new Date(),
      'partnerDetails.reviewedBy': verifiedBy || 'Solarize EPC Desk',
      'technicalFeasibility.status': finalStatus,
      'technicalFeasibility.notes': feasibilityNotes || rejectionReason || '',
      'technicalFeasibility.reviewedAt': new Date(),
      overallStatus: overall,
    };

    if (documentAudits && typeof documentAudits === 'object') {
      for (const [docKey, auditVal] of Object.entries(documentAudits)) {
        if (auditVal && auditVal.status) {
          update[`documents.${docKey}.status`] = auditVal.status;
          if (auditVal.remarks) {
            update[`documents.${docKey}.remarks`] = auditVal.remarks;
          }
        }
      }
    }

    if (dbConnected) {
      const rec = await Application.findOneAndUpdate(
        buildAppQuery(id),
        { $set: update },
        { new: true }
      );
      return res.json({ success: true, message: `Technical feasibility updated: ${finalStatus}`, record: rec });
    } else {
      const idx = inMemoryRegistrations.findIndex((r) => r._id === id || r.registrationId === id);
      if (idx !== -1) {
        inMemoryRegistrations[idx].partnerDetails = {
          ...inMemoryRegistrations[idx].partnerDetails,
          status: finalStatus,
          feasibilityNotes: update['partnerDetails.feasibilityNotes'],
          reviewedAt: new Date(),
          reviewedBy: verifiedBy || 'Solarize EPC Desk',
        };
        inMemoryRegistrations[idx].overallStatus = overall;
        if (documentAudits && inMemoryRegistrations[idx].documents) {
          for (const [docKey, auditVal] of Object.entries(documentAudits)) {
            if (inMemoryRegistrations[idx].documents[docKey] && auditVal) {
              inMemoryRegistrations[idx].documents[docKey].status = auditVal.status;
              if (auditVal.remarks) inMemoryRegistrations[idx].documents[docKey].remarks = auditVal.remarks;
            }
          }
        }
        return res.json({ success: true, message: `Technical feasibility updated: ${finalStatus}`, record: inMemoryRegistrations[idx] });
      }
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
  } catch (err) {
    console.error('Partner verify error:', err);
    res.status(500).json({ success: false, message: 'Failed to update partner feasibility.' });
  }
});

app.patch('/api/registrations/:id/finance-verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, loanAmount, remarks, financerId, financerName } = req.body;

    const update = {
      'financingDetails.status': status || 'Approved',
      'financingDetails.loanAmount': Number(loanAmount) || 0,
      'financingDetails.remarks': remarks || '',
      'financingDetails.financerId': financerId || '',
      'financingDetails.financerName': financerName || 'SBI',
    };

    if (dbConnected) {
      const rec = await Application.findOneAndUpdate(
        buildAppQuery(id),
        { $set: update },
        { new: true }
      );
      return res.json({ success: true, message: `Loan status updated to ${status}`, record: rec });
    } else {
      const idx = inMemoryRegistrations.findIndex((r) => r._id === id || r.registrationId === id);
      inMemoryRegistrations[idx].financingDetails = {
        ...inMemoryRegistrations[idx].financingDetails,
        status: status || 'Approved',
        loanAmount: Number(loanAmount) || 0,
        remarks: remarks || '',
        financerId: financerId || '',
        financerName: financerName || 'SBI',
      };
      return res.json({ success: true, message: `Loan status updated to ${status}`, record: inMemoryRegistrations[idx] });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update finance status.' });
  }
});

app.patch('/api/registrations/:id/assign-installer', async (req, res) => {
  try {
    const { id } = req.params;
    const { installerId, installerName, installerPhone } = req.body;

    const update = {
      'installerDetails.installerId': installerId,
      'installerDetails.installerName': installerName,
      'installerDetails.installerPhone': installerPhone || '',
      'installerDetails.status': 'Assigned',
      'installerDetails.assignedAt': new Date(),
    };

    if (dbConnected) {
      const rec = await Application.findOneAndUpdate(
        buildAppQuery(id),
        { $set: update },
        { new: true }
      );
      return res.json({ success: true, message: `Assigned to Installer ${installerName}`, record: rec });
    } else {
      const idx = inMemoryRegistrations.findIndex((r) => r._id === id || r.registrationId === id);
      inMemoryRegistrations[idx].installerDetails = {
        ...inMemoryRegistrations[idx].installerDetails,
        installerId,
        installerName,
        installerPhone: installerPhone || '',
        status: 'Assigned',
        assignedAt: new Date(),
      };
      return res.json({ success: true, message: `Assigned to Installer ${installerName}`, record: inMemoryRegistrations[idx] });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign installer.' });
  }
});

app.patch('/api/registrations/:id/installer-complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { serialNumbers, proofPhoto } = req.body;

    const update = {
      'installerDetails.status': 'Completed',
      'installerDetails.completedAt': new Date(),
      'installerDetails.serialNumbers': serialNumbers || '',
      'installerDetails.proofPhoto': proofPhoto || '',
      'verification.status': 'Done',
    };

    if (dbConnected) {
      const rec = await Application.findOneAndUpdate(
        buildAppQuery(id),
        { $set: update },
        { new: true }
      );
      return res.json({ success: true, message: 'Installation marked Completed!', record: rec });
    } else {
      const idx = inMemoryRegistrations.findIndex((r) => r._id === id || r.registrationId === id);
      inMemoryRegistrations[idx].installerDetails.status = 'Completed';
      inMemoryRegistrations[idx].installerDetails.completedAt = new Date();
      inMemoryRegistrations[idx].installerDetails.serialNumbers = serialNumbers || '';
      inMemoryRegistrations[idx].installerDetails.proofPhoto = proofPhoto || '';
      inMemoryRegistrations[idx].verification.status = 'Done';
      return res.json({ success: true, message: 'Installation marked Completed!', record: inMemoryRegistrations[idx] });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update installation.' });
  }
});

app.get('/api/registrations/track/:query', async (req, res) => {
  try {
    const rawQuery = decodeURIComponent(req.params.query).trim();
    if (!rawQuery) return res.status(400).json({ success: false, message: 'Query is required.' });

    let records = [];
    if (dbConnected) {
      records = await Application.find({
        $or: [
          { registrationId: { $regex: new RegExp(`^${rawQuery}$`, 'i') } },
          { mobile: { $regex: new RegExp(rawQuery, 'i') } },
          { consumerNo: { $regex: new RegExp(`^${rawQuery}$`, 'i') } },
          { email: { $regex: new RegExp(`^${rawQuery}$`, 'i') } },
        ],
      }).sort({ createdAt: -1 });
    } else {
      const q = rawQuery.toLowerCase();
      records = inMemoryRegistrations.filter(
        (r) =>
          (r.registrationId && r.registrationId.toLowerCase() === q) ||
          (r.mobile && r.mobile.includes(q)) ||
          (r.consumerNo && r.consumerNo.toLowerCase() === q) ||
          (r.email && r.email.toLowerCase() === q)
      );
    }

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No application found matching "${rawQuery}". Please check the details.`,
      });
    }

    res.json({ success: true, count: records.length, records });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error while tracking.' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    let list = dbConnected ? await Application.find() : inMemoryRegistrations;

    const total = list.length;
    const pending = list.filter((r) => !r.verification?.status || r.verification?.status === 'Pending').length;
    const verified = list.filter((r) => ['Verified', 'Approved', 'Done'].includes(r.verification?.status)).length;
    const installed = list.filter((r) => r.installerDetails?.status === 'Completed').length;
    const financing = list.filter((r) => r.financingDetails?.status === 'Approved').length;

    res.json({
      success: true,
      stats: {
        total,
        pending,
        done: verified,
        verified,
        installed,
        financing,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Stats error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 SolarConnect Unified Multi-Tier Platform running on http://localhost:${PORT}`);
});
