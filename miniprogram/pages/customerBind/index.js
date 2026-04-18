Page({
  data: {
    inviteId: "",
    name: "",
    phone: "",
    submitting: false,
    bindDone: false,
    bindMsg: "",
  },

  onLoad(options) {
    this.setData({ inviteId: options.inviteId || "" });
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value.trim() });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value.trim() });
  },

  submitBind() {
    const { inviteId, name, phone, submitting } = this.data;
    const app = getApp();

    if (submitting) {
      return;
    }
    if (!inviteId) {
      wx.showToast({ title: "邀请信息无效", icon: "none" });
      return;
    }
    if (!wx.cloud || !app.globalData.env) {
      wx.showToast({ title: "云环境未配置", icon: "none" });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: "绑定中..." });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "acceptCustomerInvite",
          inviteId,
          name,
          phone,
        },
      })
      .then((resp) => {
        if (!resp.result || !resp.result.success) {
          wx.showToast({
            title: (resp.result && resp.result.errMsg) || "绑定失败",
            icon: "none",
          });
          return;
        }

        this.setData({
          bindDone: true,
          bindMsg: resp.result.existed ? "你已绑定过该商家" : "绑定成功，可以开始下单啦",
        });
      })
      .catch(() => {
        wx.showToast({ title: "绑定失败", icon: "none" });
      })
      .finally(() => {
        wx.hideLoading();
        this.setData({ submitting: false });
      });
  },
});
