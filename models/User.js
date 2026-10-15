const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      default: '',
      trim: true,
    },
    password: {
      type: String,
      default: 'solar@123',
    },
    role: {
      type: String,
      enum: [
        'superadmin',
        'admin',
        'distributor',
        'agent',
        'executive',
        'partner',
        'financer',
        'installer',
        'user',
      ],
      default: 'agent',
    },
    executiveId: {
      type: String,
      default: function () {
        return 'EX-' + Math.floor(100 + Math.random() * 900);
      },
    },
    territory: {
      type: String,
      default: '',
      trim: true,
    },
    companyName: {
      type: String,
      default: '',
      trim: true,
    },
    // Unique Hierarchical Code (ADM-101, DST-101-01, AGT-101-01-01, USR-101-01-01-001)
    code: {
      type: String,
      default: '',
      trim: true,
    },
    // Hierarchy link (who created this user)
    createdById: {
      type: String,
      default: '',
    },
    createdByName: {
      type: String,
      default: '',
    },
    // Explicit 4-Tier Lineage Traceability
    adminId: { type: String, default: '' },
    adminName: { type: String, default: '' },
    adminCode: { type: String, default: '' },
    distributorId: { type: String, default: '' },
    distributorName: { type: String, default: '' },
    distributorCode: { type: String, default: '' },
    agentId: { type: String, default: '' },
    agentName: { type: String, default: '' },
    agentCode: { type: String, default: '' },
    // Distributor automation and partner routing
    verificationMode: {
      type: String,
      enum: ['MANUAL', 'AUTO'],
      default: 'MANUAL',
    },
    assignedPartnerId: { type: String, default: '' },
    assignedPartnerName: { type: String, default: '' },
    assignedFinancerId: { type: String, default: '' },
    assignedFinancerName: { type: String, default: '' },
    // For consumer user accounts
    consumerNo: {
      type: String,
      default: '',
      trim: true,
    },
    registrationId: {
      type: String,
      default: '',
      trim: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema, process.env.COLLECTION_USERS || 'users');
