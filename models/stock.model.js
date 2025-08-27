import mongoose from "mongoose";

const StockSchema = new mongoose.Schema(
  {
    isin: { type: String, required: true, unique: true },
    stockName: { type: String, required: true },
    ticker: { type: String, default: "" },
    open: { type: Number, default: null },
    high: { type: Number, default: null },
    low: { type: Number, default: null },
    close: { type: Number, default: null },
    last: { type: Number, default: null },
    volume: { type: Number, default: null },
    prediction: { type: String, default: "" },
  },
  { collection: "stocks", timestamps: true }
);

StockSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Stock = mongoose.models.Stock || mongoose.model("Stock", StockSchema);

export default Stock;
