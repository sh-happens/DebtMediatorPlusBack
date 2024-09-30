import mongoose from "mongoose";

const borrowerSchema = new mongoose.Schema(
  {
    inn: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^\d{12}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid INN! It should be 12 digits.`,
      },
    },
    phoneNumber: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^\d{11}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number! It should be 11 digits.`,
      },
    },
  },
  { timestamps: true }
);

borrowerSchema.index({ inn: 1, phoneNumber: 1 });

const Borrower = mongoose.model("Borrower", borrowerSchema);

export default Borrower;
