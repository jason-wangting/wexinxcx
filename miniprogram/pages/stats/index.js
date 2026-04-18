const RECORDS_KEY = "book_records";

function getDateText(ts) {
  const date = new Date(ts);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayText() {
  return getDateText(Date.now());
}

Page({
  data: {
    modeOptions: ["当天", "具体日期", "日期范围"],
    modeIndex: 0,
    singleDate: getTodayText(),
    startDate: getTodayText(),
    endDate: getTodayText(),
    records: [],
    filteredRecords: [],
    totalCount: 0,
    totalAmount: "0.00",
    byGoods: [],
  },

  onShow() {
    const records = wx.getStorageSync(RECORDS_KEY) || [];
    this.setData({ records }, () => this.applyFilter());
  },

  onModeChange(e) {
    this.setData({ modeIndex: Number(e.detail.value) }, () => this.applyFilter());
  },

  onSingleDateChange(e) {
    this.setData({ singleDate: e.detail.value }, () => this.applyFilter());
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value }, () => this.applyFilter());
  },

  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value }, () => this.applyFilter());
  },

  isInRange(dateText, startText, endText) {
    return dateText >= startText && dateText <= endText;
  },

  applyFilter() {
    const { records, modeIndex, singleDate, startDate, endDate } = this.data;
    let filteredRecords = [];

    if (modeIndex === 0) {
      const today = getTodayText();
      filteredRecords = records.filter((item) => getDateText(item.createdAt) === today);
    }

    if (modeIndex === 1) {
      filteredRecords = records.filter((item) => getDateText(item.createdAt) === singleDate);
    }

    if (modeIndex === 2) {
      const start = startDate <= endDate ? startDate : endDate;
      const end = startDate <= endDate ? endDate : startDate;
      filteredRecords = records.filter((item) => this.isInRange(getDateText(item.createdAt), start, end));
    }

    const totalCount = filteredRecords.length;
    const totalAmountNum = filteredRecords.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const grouped = {};

    filteredRecords.forEach((item) => {
      const key = item.goodsId || item.goodsName;
      if (!grouped[key]) {
        grouped[key] = {
          name: item.goodsName,
          category: item.category || "未分类",
          count: 0,
          amount: 0,
          quantity: 0,
        };
      }
      grouped[key].count += 1;
      grouped[key].quantity += Number(item.quantity || 0);
      grouped[key].amount += Number(item.amount || 0);
    });

    const byGoods = Object.values(grouped)
      .map((item) => ({
        ...item,
        amountText: item.amount.toFixed(2),
      }))
      .sort((a, b) => b.amount - a.amount);

    this.setData({
      filteredRecords,
      totalCount,
      totalAmount: totalAmountNum.toFixed(2),
      byGoods,
    });
  },
});
