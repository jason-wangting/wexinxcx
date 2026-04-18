const USER_PROFILE_KEY = "user_profile";
const DEFAULT_AVATAR = "../../images/icons/avatar.png";

const buildRoleText = (role) => {
  if (role === "seller") {
    return "卖家";
  }
  if (role === "buyer") {
    return "买家";
  }
  return "请选择";
};

const buildBuyerIdText = (openid) => {
  if (!openid) {
    return "未同步";
  }
  return `ID-${openid.slice(-6).toUpperCase()}`;
};

Page({
  data: {
    isLoggedIn: false,
    awaitingNickname: false,
    avatarUrl: DEFAULT_AVATAR,
    userName: "",
    pendingNickname: "",
    role: "",
    roleText: "请选择",
    memberType: "普通会员",
    memberExpireText: "长期有效",
    buyerIdText: "未同步",
  },

  onShow() {
    this.loadProfile();
  },

  loadProfile() {
    const profile = wx.getStorageSync(USER_PROFILE_KEY) || {};
    if (profile.nickName || profile.avatarUrl) {
      const role = profile.role || "";
      this.setData({
        isLoggedIn: true,
        userName: profile.nickName || "",
        avatarUrl: profile.avatarUrl || DEFAULT_AVATAR,
        role,
        roleText: buildRoleText(role),
        buyerIdText: buildBuyerIdText(profile.openid),
      });
    } else {
      this.setData({
        isLoggedIn: false,
        awaitingNickname: false,
        role: "",
        roleText: buildRoleText(""),
        buyerIdText: "未同步",
      });
    }
  },

  // Step 1: tap login button → choose avatar
  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) {
      return;
    }
    this.setData({ avatarUrl, awaitingNickname: true });
  },

  onNicknameInput(e) {
    this.setData({ pendingNickname: e.detail.value });
  },

  onNicknameConfirm(e) {
    this.setData({ pendingNickname: e.detail.value });
    this.finishLogin();
  },

  finishLogin() {
    const nickName = (this.data.pendingNickname || "").trim() || "微信用户";
    const avatarUrl = this.data.avatarUrl;
    const prevProfile = wx.getStorageSync(USER_PROFILE_KEY) || {};
    const role = prevProfile.role || "";
    const profile = { ...prevProfile, nickName, avatarUrl, role };
    wx.setStorageSync(USER_PROFILE_KEY, profile);
    this.setData({
      isLoggedIn: true,
      awaitingNickname: false,
      userName: nickName,
      role,
      roleText: buildRoleText(role),
    });
    // Silently fetch and save openid in background
    wx.cloud
      .callFunction({ name: "quickstartFunctions", data: { type: "getOpenId" } })
      .then((res) => {
        if (res.result && res.result.openid) {
          profile.openid = res.result.openid;
          wx.setStorageSync(USER_PROFILE_KEY, profile);
          this.setData({ buyerIdText: buildBuyerIdText(res.result.openid) });
        }
      })
      .catch(() => {});
  },

  onSelectRole(e) {
    const { role } = e.currentTarget.dataset;
    if (!role) {
      return;
    }
    this.updateRole(role, false);
  },

  onSwitchRole(e) {
    const { role } = e.currentTarget.dataset;
    if (!role || role === this.data.role) {
      return;
    }
    this.updateRole(role, true);
  },

  updateRole(role, showToast) {
    const profile = wx.getStorageSync(USER_PROFILE_KEY) || {};
    profile.role = role;
    wx.setStorageSync(USER_PROFILE_KEY, profile);
    this.setData({ role, roleText: buildRoleText(role) });
    if (showToast) {
      wx.showToast({ title: `已切换为${buildRoleText(role)}`, icon: "none" });
    }
  },

  goEditProfile() {
    wx.navigateTo({ url: "/pages/profileEdit/index" });
  },

  // Change avatar after login
  onChangeAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) {
      return;
    }
    const profile = wx.getStorageSync(USER_PROFILE_KEY) || {};
    profile.avatarUrl = avatarUrl;
    wx.setStorageSync(USER_PROFILE_KEY, profile);
    this.setData({ avatarUrl });
  },

  logout() {
    wx.showModal({
      title: "退出登录",
      content: "确认退出登录？",
      confirmColor: "#cc4d33",
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        wx.removeStorageSync(USER_PROFILE_KEY);
        this.setData({
          isLoggedIn: false,
          awaitingNickname: false,
          userName: "",
          avatarUrl: DEFAULT_AVATAR,
          pendingNickname: "",
          role: "",
          roleText: buildRoleText(""),
          buyerIdText: "未同步",
        });
        wx.showToast({ title: "已退出", icon: "success" });
      },
    });
  },
});
