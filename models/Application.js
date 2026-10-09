const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    // Section 6.1: Registration Header
    registrationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    executiveName: {
      type: String,
      default: 'Self / Direct Applicant',
      trim: true,
    },
    executiveId: {
      type: String,
      default: 'EX-ONLINE',
      trim: true,
    },
    areaDistrict: {
      type: String,
      required: true,
      trim: true,
    },
    issuedOn: {
      type: Date,
      default: Date.now,
    },
    submissionMode: {
      type: String,
      enum: ['FIELD_EXECUTIVE', 'SELF_APPLICANT'],
      default: 'SELF_APPLICANT',
    },

    // Section 6.2: Applicant Details
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    alternateNo: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    districtCity: {
      type: String,
      required: true,
      trim: true,
    },
    pinCode: {
      type: String,
      required: true,
      trim: true,
    },

    // Section 6.3: Property & Electricity
    consumerNo: {
      type: String,
      required: true,
      trim: true,
    },
    avgMonthlyBill: {
      type: Number,
      required: true,
    },
    connectionName: {
      type: String,
      enum: ['Self', 'Father', 'Mother', 'Spouse', 'Landlord', 'Other'],
      default: 'Self',
    },
    propertyType: {
      type: String,
      enum: ['Residential', 'Commercial', 'Agricultural'],
      default: 'Residential',
    },
    ownership: {
      type: String,
      enum: ['Owned', 'Rented'],
      default: 'Owned',
    },
    propertyAddress: {
      type: String,
      required: true,
      trim: true,
    },
    landDetails: {
      type: String,
      default: '',
      trim: true,
    },
    rooftopArea: {
      type: Number,
      default: 0,
    },
    roofType: {
      type: String,
      enum: ['RCC', 'Tin', 'Other'],
      default: 'RCC',
    },

    // Section 6.4: Document Checklist & GPS Rooftop Photo
    documents: {
      aadhaarCard: { collected: { type: Boolean, default: false }, fileName: String },
      panCard: { collected: { type: Boolean, default: false }, fileName: String },
      bijliBill: { collected: { type: Boolean, default: false }, fileName: String },
      bankPassbook: { collected: { type: Boolean, default: false }, fileName: String },
      jaminRasid: { collected: { type: Boolean, default: false }, fileName: String },
      rooftopGpsPhoto: {
        collected: { type: Boolean, default: false },
        fileName: String,
        gpsLatitude: String,
        gpsLongitude: String,
        capturedWithGps: { type: Boolean, default: true },
      },
    },

    // Section 6.5: Declaration & Signatures
    declarationAccepted: {
      type: Boolean,
      required: true,
      default: true,
    },
    applicantSignature: {
      type: String,
      default: '',
    },
    executiveSignature: {
      type: String,
      default: '',
    },

    // Section 7: Office Verification
    verification: {
      status: {
        type: String,
        enum: ['Pending', 'Under Survey', 'Verified', 'Approved', 'Rejected', 'Done'],
        default: 'Pending',
      },
      verifiedAt: Date,
      verifiedBy: String,
      remarks: {
        type: String,
        default: '',
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Application', applicationSchema);
