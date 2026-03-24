window.onload = function () {
  document.getElementById("totalValue").value = 1000000;
  document.getElementById("lumpsum").value = 100000;

  addRow("HDFC Equity Fund", 300000);
  addRow("ICICI Equity Fund", 200000);
  addRow("SBI Debt Fund", 300000);
  addRow("Axis Gold Fund", 200000);
};

function addRow(name = "", value = "") {
  const table = document.getElementById("portfolioTable");
  const row = table.insertRow();
  row.innerHTML = `
    <td><input value="${name}"></td>
    <td><input type="number" value="${value}"></td>
  `;
}

async function rebalance() {
  const rows = document.getElementById("portfolioTable").rows;
  const totalValue = Number(document.getElementById("totalValue").value);
  const riskProfile = document.getElementById("riskProfile").value;
  const lumpsum = Number(document.getElementById("lumpsum").value);

  let portfolio = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].cells;
    portfolio.push({
      name: cells[0].children[0].value,
      currentValue: Number(cells[1].children[0].value)
    });
  }

  const res = await fetch("http://localhost:5000/rebalance", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ portfolio, totalValue, riskProfile, lumpsum })
  });

  const data = await res.json();

  console.log(data);
}
