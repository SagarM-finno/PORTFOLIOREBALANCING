const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const RISK_MAP = {
  Aggressive: { equity: 70, debt: 20, gold: 10 },
  Moderate: { equity: 50, debt: 40, gold: 10 },
  Conservative: { equity: 30, debt: 60, gold: 10 }
};

function getCategory(fundName) {
  const name = fundName.toLowerCase();
  if (name.includes("equity")) return "equity";
  if (name.includes("debt")) return "debt";
  return "gold";
}

app.post("/rebalance", (req, res) => {
  const { portfolio, totalValue, riskProfile, lumpsum = 0 } = req.body;

  const targetAlloc = RISK_MAP[riskProfile];

  const categoryMap = {};
  portfolio.forEach(f => {
    const cat = getCategory(f.name);
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push({ ...f, category: cat });
  });

  let result = [];

  Object.keys(categoryMap).forEach(cat => {
    const funds = categoryMap[cat];
    const categoryTotal = funds.reduce((s, f) => s + f.currentValue, 0);
    const categoryTargetValue = (targetAlloc[cat] / 100) * totalValue;

    funds.forEach(f => {
      const weight = categoryTotal === 0 ? 0 : f.currentValue / categoryTotal;
      const targetValue = categoryTargetValue * weight;
      const gap = targetValue - f.currentValue;

      result.push({
        fund: f.name,
        category: cat,
        currentValue: Math.round(f.currentValue),
        targetValue: Math.round(targetValue),
        gap: Math.round(gap),
        initialAction: gap > 0 ? "BUY" : gap < 0 ? "SELL" : "HOLD",
        allocatedLumpsum: 0
      });
    });
  });

  let remaining = lumpsum;

  result
    .filter(f => f.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .forEach(f => {
      if (remaining <= 0) return;
      const allocation = Math.min(f.gap, remaining);
      f.allocatedLumpsum = Math.round(allocation);
      f.gap -= allocation;
      remaining -= allocation;
    });

  result.forEach(f => {
    if (Math.abs(f.gap) < 100) {
      f.finalAction = "HOLD";
      f.finalAmount = 0;
    } else if (f.gap > 0) {
      f.finalAction = "BUY";
      f.finalAmount = Math.round(f.gap);
    } else {
      f.finalAction = "SELL";
      f.finalAmount = Math.abs(Math.round(f.gap));
    }
  });

  const summary = {
    totalBuy: result.filter(f => f.finalAction === "BUY").reduce((s, f) => s + f.finalAmount, 0),
    totalSell: result.filter(f => f.finalAction === "SELL").reduce((s, f) => s + f.finalAmount, 0),
    lumpsumUsed: lumpsum - remaining,
    remainingLumpsum: remaining
  };

  res.json({ funds: result, summary });
});

app.listen(5000, () => console.log("Rebalancing engine ready"));
