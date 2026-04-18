const USER_PROFILE_KEY = "user_profile";

Page({
  data: {
    avatarUrl: "../../images/icons/avatar.png",
    userName: "",
  },

  onLoad() {
    const profile = wx.getStorageSync(USER_PROFILE_KEY) || {};
    this.setData({
      avatarUrl: profile.avatarUrl || "../../images/icons/avatar.png",
      userName: profile.nickName || "",
    });
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) return;
    this.setData({ avatarUrl });
  },

  onNicknameInput(e) {
    this.setData({ userName: e.detail.value });
  },

  save() {
    const nickName = (this.data.userName || "").trim();
    if (!nickName) {
      wx.showToast({ title: "昵称不能为空", icon: "none" });
      return;
    }
    const profile = wx.getStorageSync(USER_PROFILE_KEY) || {};
    profile.nickName = nickName;
    profile.avatarUrl = this.data.avatarUrl;
    wx.setStorageSync(USER_PROFILE_KEY, profile);
    wx.showToast({ title: "保存成功", icon: "success" });
    setTimeout(() => wx.navigateBack(), 800);
  },
});
