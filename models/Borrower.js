import mongoose from "mongoose";

const borrowerSchema = new mongoose.Schema(
  {
    iin: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    phoneNumber: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

borrowerSchema.index({ iin: 1, phoneNumber: 1 });

const Borrower = mongoose.model("Borrower", borrowerSchema);

export default Borrower;
