import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema(
  {
    adminName: { type: String, required: true },
    companyName: { type: String, required: true },
    companyAddress: String,
    companyEmail: { type: String, required: true },
    whatsappPhone: String,
    facebookLink: String,
    instagramLink: String,
    logoUrl: String,
    useAi: Boolean
  },
  { timestamps: true }
);

const Profile = mongoose.models.Profile || mongoose.model("Profile", ProfileSchema);
export default Profile;
