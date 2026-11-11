import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["customer", "farmer", "fpo"], required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
  village: { type: String, trim: true, default: "" },
  fpoName: { type: String, trim: true, default: "" },
  fpoMembershipNo: { type: String, trim: true, default: "" },
  acres: { type: Number, min: 0, default: 0 },
  crops: { type: String, trim: true, default: "" },
  landRecord: { type: String, trim: true, default: "" },
  rejectionReason: { type: String, trim: true, default: "" }
}, { timestamps: true });

const productSchema = new Schema({
  farmer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0.01 },
  qty: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, trim: true, default: "kg" },
  harvestDate: { type: Date, default: Date.now },
  sellBy: { type: Date, required: true },
  surplus: { type: Boolean, default: false },
  photoUrl: { type: String, trim: true, default: "" }
}, { timestamps: true });

const orderSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  farmer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  customerName: { type: String, required: true, trim: true },
  customerPhone: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  landmark: { type: String, trim: true, default: "" },
  itemName: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  unit: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  total: { type: Number, required: true },
  status: { type: String, enum: ["New", "Out for delivery", "Delivered", "Cancelled", "Delivery failed", "Issue reported", "Resolved"], default: "New", index: true },
  reason: { type: String, default: "" },
  customerNote: { type: String, default: "" },
  etaAt: { type: Date },
  etaMinutes: { type: Number },
  farmerLocation: { type: String, default: "" },
  near: { type: Boolean, default: false },
  resolution: { type: String, default: "" }
}, { timestamps: true });

const requestSchema = new Schema({
  customerName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  item: { type: String, required: true, trim: true },
  qty: { type: Number, required: true, min: 0.1 },
  unit: { type: String, required: true, trim: true },
  note: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["open", "fulfilled", "cancelled"], default: "open", index: true }
}, { timestamps: true });

const notificationSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  text: { type: String, required: true },
  type: { type: String, default: "info" },
  read: { type: Boolean, default: false, index: true }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
export const CustomerRequest = mongoose.models.CustomerRequest || mongoose.model("CustomerRequest", requestSchema);
export const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
