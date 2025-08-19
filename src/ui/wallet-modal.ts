import QRCodeStyling from "qr-code-styling";
import { ModalStatusType, ThemeType } from "../utils/types";

import LoadingDark from "../assets/images/gif_screen_loading_darkmode.gif";
import LoadingLight from "../assets/images/gif_screen_loading_fff.gif";
import Refresh from "../assets/images/refresh.svg";
import TimerImg from "../assets/images/timer.svg";
import TimerLightImg from "../assets/images/timer_light_mode.svg";
import ConnectFailedDark from "../assets/images/connect_failed_darkmode.svg";
import ConnectFailedLight from "../assets/images/connect_failed_lightmode.svg";
import SuccessDark from "../assets/images/success_darkmode.svg";
import SuccessLight from "../assets/images/success_lightmode.svg";
import FailedDark from "../assets/images/failed_darkmode.svg";
import FailedLight from "../assets/images/failed_lightmode.svg";

import qrDarkConfig from "../assets/qr_gmwallet_darkMode.json";
import qrLightConfig from "../assets/qr_gmwallet_lightMode.json";

export interface WalletModalOptions {
  connectImgUrl?: string;
  theme?: ThemeType;
}

interface ModalState {
  second: number;
  setIntervalNum: NodeJS.Timeout | null;
  isShow: boolean;
  isAndroid: boolean;
  isIos: boolean;
  isWeb: boolean;
  isGmwallet: boolean;
}

export class WalletModal {
  private modalState: ModalState;
  private maxTime: number = 5* 60;
  private refreshCallback: () => Promise<string> = async () => "";
  private closeCallback: () => void = () => {};
  private globalOption: WalletModalOptions;
  private currentOperation: string = "connect";

  private readonly themeColors = {
    dark: {
      modalBackground: "#333333",
      textPrimary: "#FFFFFF", 
      textSecondary: "#AAAAAA",
      textTertiary: "#666666",
      timerIcon: TimerImg,
      failedIcon: ConnectFailedDark,
      loadingGif: LoadingDark,
      successIcon: SuccessDark,
      errorIcon: FailedDark,
      borderColor: "#38A3C0",
      qrConfig: qrDarkConfig
    },
    light: {
      modalBackground: "#FFFFFF",
      textPrimary: "#040821",
      textSecondary: "#666666", 
      textTertiary: "#666666",
      timerIcon: TimerLightImg,
      failedIcon: ConnectFailedLight,
      loadingGif: LoadingLight,
      successIcon: SuccessLight,
      errorIcon: FailedLight,
      borderColor: "#38A3C0",
      qrConfig: qrLightConfig
    }
  };

  constructor() {
    this.globalOption = {};
    this.modalState = {
      second: this.maxTime,
      setIntervalNum: null,
      isShow: false,
      isAndroid: false,
      isIos: false,
      isWeb: false,
      isGmwallet: false,
    };
  }

  private getCurrentTheme(): ThemeType {
    return this.globalOption.theme || "dark";
  }

  private getThemeColors() {
    return this.themeColors[this.getCurrentTheme()];
  }

  private getOperationMessages(): { title: string; subtitle: string } {
    switch (this.currentOperation) {
      case "connect":
        return {
          title: "Connect GM Wallet",
          subtitle: "Proceed with authentication in your wallet to use GM Wallet."
        };
      case "eth_sendTransaction":
        return {
          title: "Send Transaction",
          subtitle: "Please confirm the transaction in your wallet."
        };
      case "personal_sign":
        return {
          title: "Sign Message",
          subtitle: "Please confirm the message signature in your wallet."
        };
      case "eth_signTypedDataV4":
        return {
          title: "Sign Data",
          subtitle: "Please confirm the data signature in your wallet."
        };
      default:
        return {
          title: "Connect GM Wallet",
          subtitle: "Proceed with authentication in your wallet to use GM Wallet."
        };
    }
  }

  show(
    gmWalletUrl: string,
    options: WalletModalOptions = {},
    onRefresh: () => Promise<string>,
    onClose: () => void,
    operation: string = "connect"
  ): void {
    if (typeof window === "undefined") return;
    this.globalOption = options;
    this.currentOperation = operation;
    this.detectDevice(gmWalletUrl);
    this.refreshCallback = onRefresh;
    this.closeCallback = onClose;
    this.createModal(gmWalletUrl, options);
    this.startTimer();
  }

  hide(): void {
    const modalElement = document.getElementById("gmwallet_modal");
    if (modalElement) {
      this.modalState.isShow = false;
      document.documentElement.style.overflow = "";
      if (this.modalState.setIntervalNum) {
        clearInterval(this.modalState.setIntervalNum);
      }
      document.body.removeChild(modalElement);
      document.body.style.overflow = "";
    }
  }

  updateStatus(message: string, type: ModalStatusType): void {
    const modal = document.getElementById("gmwallet_modal_component");
    const column = document.getElementById("column");

    if (!modal || !column) return;

    console.log("Update Status:", type, message);
    if (type === "connecting") {
      this.showConnectingState(message);
    } else if (type === "success") {
      this.showSuccessState(message);
    } else if (type === "error") {
      this.showErrorState(message);
    }
  }

  private detectDevice(gmWalletUrl: string): void | string {
    let userInfo = "";
    if (typeof window !== "undefined" && window.navigator?.userAgent) {
      userInfo = window.navigator.userAgent.toLowerCase();
    }

    this.modalState.isAndroid = userInfo.includes("android");
    this.modalState.isIos =
      userInfo.includes("ios") ||
      userInfo.includes("ipad") ||
      userInfo.includes("iphone");
    this.modalState.isWeb = !(
      this.modalState.isAndroid || this.modalState.isIos
    );
    this.modalState.isGmwallet = userInfo.includes("gmwallet_webview");
    if (this.modalState.isAndroid || this.modalState.isIos) {
      if (!this.modalState.isGmwallet) {
        let browser = {
          url: window.location.href,
        };
        if (this.modalState.isIos) {
          return (window.location.href = `gmwallet://splash?browser=${JSON.stringify(
            browser
          )}`);
        } else if (this.modalState.isAndroid) {
          return (window.location.href = `gmwallet://wallet.mammothlabs.io/splash?browser=${JSON.stringify(
            browser
          )}`);
        }
      } else {
        setTimeout(() => {
          window.location.href = gmWalletUrl;
        }, 1000);
      }
    }
    this.modalState.isShow = true;
  }

  private createModal(gmWalletUrl: string, options: WalletModalOptions): void {
    const allContainer = document.createElement("div");
    allContainer.id = "gmwallet_modal";
    this.setContainerStyles(allContainer);

    const background = document.createElement("div");
    background.id = "gmwallet_modal_background";
    this.setBackgroundStyles(background);

    const modal = document.createElement("div");
    modal.id = "gmwallet_modal_component";
    this.setModalStyles(modal);

    const modalWrap = document.createElement("div");
    modalWrap.id = "gmwallet_modalWrap_wrap";
    this.setModalWrapStyles(modalWrap);

    const column = document.createElement("div");
    column.id = "column";
    this.setColumnStyles(column);

    this.createModalContent(column, gmWalletUrl, options);

    modal.appendChild(column);
    modalWrap.appendChild(modal);
    allContainer.appendChild(background);
    allContainer.appendChild(modalWrap);

    this.addResetStyles(allContainer);
    this.addEventListeners(background);
    this.addModalWrapEventListener(modalWrap);

    document.body.appendChild(allContainer);
    document.body.style.overflow = "hidden";
  }

  private createModalContent(
    column: HTMLElement,
    gmWalletUrl: string,
    options: WalletModalOptions
  ): void {
    const themeColors = this.getThemeColors();
    const messages = this.getOperationMessages();
    
    const title = document.createElement("div");
    title.id = "title";
    title.textContent = "Scan with the GM Wallet";
    title.style.fontSize = "18px";
    title.style.color = themeColors.textPrimary;
    title.style.fontWeight = "700";
    title.style.fontFamily = "'Roboto'";
    title.style.lineHeight = "20px";
    title.style.textAlign = "center";
    title.style.wordWrap = "break-word";
    title.style.maxWidth = "100%";


    if (this.modalState.isWeb) {
      column.appendChild(title);
      this.createQRCode(column, gmWalletUrl);
      this.createTimer(column);
      this.createDownloadSection(column);
    } else {
      // Add title for mobile using operation-specific message
      const mobileTitle = document.createElement("div");
      mobileTitle.textContent = messages.title;
      mobileTitle.style.fontSize = "18px";
      mobileTitle.style.color = themeColors.textPrimary;
      mobileTitle.style.fontWeight = "700";
      mobileTitle.style.fontFamily = "'Roboto'";
      mobileTitle.style.lineHeight = "20px";
      mobileTitle.style.textAlign = "center";
      mobileTitle.style.wordWrap = "break-word";
      mobileTitle.style.maxWidth = "100%";
      column.appendChild(mobileTitle);

      // Add subtitle for mobile using operation-specific message
      const mobileSubtitle = document.createElement("div");
      mobileSubtitle.textContent = messages.subtitle;
      mobileSubtitle.style.fontFamily = "'Roboto'";
      mobileSubtitle.style.fontWeight = "400";
      mobileSubtitle.style.fontSize = "14px";
      mobileSubtitle.style.lineHeight = "16px";
      mobileSubtitle.style.textAlign = "center";
      mobileSubtitle.style.color = "#AAAAAA";
      mobileSubtitle.style.maxWidth = "100%";
      mobileSubtitle.style.wordWrap = "break-word";
      column.appendChild(mobileSubtitle);

      // Loading GIF
      const loadingImgWrap = document.createElement("div");
      const loadingImg = document.createElement("img");
      loadingImg.src = themeColors.loadingGif; // Use theme-based loading GIF
      loadingImg.style.width = "200px"; // Same size as PC loading GIF
      loadingImg.style.height = "200px";

      loadingImgWrap.appendChild(loadingImg);
      column.appendChild(loadingImgWrap);
    }
  }

  private createQRCode(column: HTMLElement, gmWalletUrl: string): void {
    const themeColors = this.getThemeColors();
    
    const qr = document.createElement("div");
    qr.id = "qr";
    qr.style.display = "flex";
    qr.style.flexDirection = "row";
    qr.style.justifyContent = "center";
    qr.style.alignItems = "center";
    qr.style.width = "200px";
    qr.style.height = "200px";
    qr.style.position = "relative";
    // qr.style.padding = "8px";

    const qrWrapper = document.createElement("div");
    qrWrapper.style.border = `4px solid ${themeColors.borderColor}`;
    qrWrapper.style.borderRadius = "8px";
    qrWrapper.style.overflow = "hidden";
    qrWrapper.style.display = "flex";
    qrWrapper.style.justifyContent = "center";
    qrWrapper.style.alignItems = "center";
    qrWrapper.style.padding = "8px";

    const qrConfig = { ...themeColors.qrConfig };
    qrConfig.data = gmWalletUrl;
    const qrCodeStyling = new QRCodeStyling(qrConfig as any);

    qrCodeStyling.append(qrWrapper);
    qr.appendChild(qrWrapper);
    column.appendChild(qr);
  }

  private createTimer(column: HTMLElement): void {
    const themeColors = this.getThemeColors();

    const timer = document.createElement("div");
    timer.id = "timer";
    timer.style.display = "flex";
    timer.style.flexDirection = "row";
    timer.style.justifyContent = "center";
    timer.style.alignItems = "center";
    timer.style.padding = "0px";
    timer.style.gap = "4px";
    timer.style.width = "auto";
    timer.style.maxWidth = "100%";
    timer.style.height = "16px";

    const timerIcon = document.createElement("img");
    timerIcon.src = themeColors.timerIcon;
    timerIcon.style.width = "14px";
    timerIcon.style.height = "14px";
    timer.appendChild(timerIcon);

    const timerText = document.createElement("div");
    timerText.style.width = "40px";
    timerText.style.height = "16px";
    timerText.style.fontFamily = "'Roboto'";
    timerText.style.fontStyle = "normal";
    timerText.style.fontWeight = "400";
    timerText.style.fontSize = "16px";
    timerText.style.lineHeight = "16px";
    timerText.style.textAlign = "center";
    timerText.style.color = themeColors.textPrimary;
    timer.appendChild(timerText);
    column.appendChild(timer);
  }

  private createDownloadSection(column: HTMLElement): void {
    const themeColors = this.getThemeColors();

    const downloadSection = document.createElement("div");
    downloadSection.id = "download";
    downloadSection.style.display = "flex";
    downloadSection.style.flexDirection = "row";
    downloadSection.style.justifyContent = "center";
    downloadSection.style.alignItems = "center";
    downloadSection.style.padding = "0px";
    downloadSection.style.gap = "8px";
    downloadSection.style.width = "auto";
    downloadSection.style.maxWidth = "100%";
    downloadSection.style.height = "auto";
    downloadSection.style.minHeight = "16px";

    const questionText = document.createElement("div");
    questionText.textContent = "Don't have a GM Wallet?";
    questionText.style.width = "auto";
    questionText.style.height = "auto";
    questionText.style.fontFamily = "'Roboto'";
    questionText.style.fontStyle = "normal";
    questionText.style.fontWeight = "400";
    questionText.style.fontSize = "14px";
    questionText.style.lineHeight = "16px";
    questionText.style.textAlign = "center";
    questionText.style.color = themeColors.textSecondary;
    questionText.style.whiteSpace = "nowrap";

    const downloadText = document.createElement("div");
    downloadText.textContent = "Download here";
    downloadText.style.width = "auto";
    downloadText.style.height = "auto";
    downloadText.style.fontFamily = "'Roboto'";
    downloadText.style.fontStyle = "normal";
    downloadText.style.fontWeight = "400";
    downloadText.style.fontSize = "14px";
    downloadText.style.lineHeight = "16px";
    downloadText.style.textAlign = "center";
    downloadText.style.color = themeColors.borderColor;
    downloadText.style.cursor = "pointer";
    downloadText.style.whiteSpace = "nowrap";

    downloadSection.appendChild(questionText);
    downloadSection.appendChild(downloadText);
    column.appendChild(downloadSection);
  }

  private startTimer(): void {
    if (!this.modalState.isWeb) return;

    this.modalState.second = this.maxTime;
    this.updateTimerDisplay();

    this.modalState.setIntervalNum = setInterval(() => {
      this.modalState.second--;
      this.updateTimerDisplay();

      if (this.modalState.second === 0) {
        this.handleTimeout();
      }
    }, 1000);
  }

  private updateTimerDisplay(): void {
    const timer = document.getElementById("timer");
    const timerText = timer?.querySelector("div");

    if (timerText) {
      const minutes = Math.floor(this.modalState.second / 60);
      const remainingSeconds = this.modalState.second % 60;
      timerText.textContent = `${minutes < 10 ? "0" : ""}${minutes}:${
        remainingSeconds < 10 ? "0" : ""
      }${remainingSeconds}`;

      if (this.modalState.second === 0) {
        timerText.style.color = "#ec0c0c";
      }
    }
  }

  private handleTimeout(): void {
    if (this.modalState.setIntervalNum) {
      clearInterval(this.modalState.setIntervalNum);
    }
    this.showRefreshOption();
  }

  private showRefreshOption(): void {
    const qr = document.getElementById("qr");
    const title = document.getElementById("title");
    if (!qr) return;

    const themeColors = this.getThemeColors();

    // Hide the title text and show failed icon
    if (title) {
      title.style.display = "none";
    }

    // Create failed icon to replace title
    const failedIcon = document.createElement("img");
    failedIcon.id = "failedIcon";
    failedIcon.src = themeColors.failedIcon;
    failedIcon.style.width = "215px";
    failedIcon.style.height = "44px";
    failedIcon.style.marginBottom = "0px";

    // Insert failed icon before QR code
    const column = document.getElementById("column");
    if (column && title) {
      column.insertBefore(failedIcon, qr);
    }

    const blurOuter = document.createElement("div");
    blurOuter.id = "blurOuter";
    blurOuter.style.position = "absolute";
    blurOuter.style.top = "0";
    blurOuter.style.left = "0";
    blurOuter.style.width = "100%";
    blurOuter.style.height = "100%";
    blurOuter.style.backdropFilter = "blur(5px)";
    blurOuter.style.display = "flex";
    blurOuter.style.justifyContent = "center";
    blurOuter.style.alignItems = "center";

    const refreshOuter = document.createElement("div");
    refreshOuter.id = "refreshWrap";
    refreshOuter.style.padding = "3px";
    refreshOuter.style.borderRadius = "50%";
    refreshOuter.style.backgroundColor = "transparent";
    refreshOuter.style.cursor = "pointer";
    refreshOuter.style.display = "flex";
    refreshOuter.style.justifyContent = "center";
    refreshOuter.style.alignItems = "center";

    const refreshIcon = document.createElement("img");
    refreshIcon.src = Refresh;
    refreshIcon.style.width = "40px";
    refreshIcon.style.height = "40px";
    refreshIcon.style.pointerEvents = "none";
    refreshIcon.style.border = "none";
    refreshIcon.style.outline = "none";
    refreshOuter.appendChild(refreshIcon);

    refreshOuter.addEventListener("click", async () => {
      if (this.modalState.second === 0) {
        qr.removeChild(blurOuter);
        const newUrl = await this.refreshCallback();
        this.refreshQRCode(newUrl);
        this.startTimer();
      }
    });

    blurOuter.appendChild(refreshOuter);
    qr.appendChild(blurOuter);
  }

  private async refreshQRCode(gmWalletUrl: string): Promise<void> {
    const qr = document.getElementById("qr");
    const timer = document.getElementById("timer");
    const timerText = timer?.querySelector("div");
    const title = document.getElementById("title");
    const failedIcon = document.getElementById("failedIcon");
    const themeColors = this.getThemeColors();

    if (timerText) {
      timerText.style.color = themeColors.textPrimary;
    }

    // Restore original title and remove failed icon
    if (title) {
      title.style.display = "block";
    }
    if (failedIcon) {
      failedIcon.remove();
    }

    if (qr) {
      try {
        // Clear existing QR code
        qr.innerHTML = "";

        const qrWrapper = document.createElement("div");
        qrWrapper.style.border = `4px solid ${themeColors.borderColor}`;
        qrWrapper.style.borderRadius = "8px";
        qrWrapper.style.overflow = "hidden";
        qrWrapper.style.display = "flex";
        qrWrapper.style.justifyContent = "center";
        qrWrapper.style.alignItems = "center";
        qrWrapper.style.padding = "8px";

        const qrConfig = { ...themeColors.qrConfig };
        qrConfig.data = gmWalletUrl;

        const qrCodeStyling = new QRCodeStyling(qrConfig as any);
        qrCodeStyling.append(qrWrapper);
        qr.appendChild(qrWrapper);
      } catch (err) {
        console.error("QR Code refresh failed:", err);
      }
    }
  }

  private showConnectingState(message: string): void {
    const column = document.getElementById("column");
    if (!column) return;
    const themeColors = this.getThemeColors();
    const messages = this.getOperationMessages();

    column.innerHTML = "";

    const title = document.createElement("div");
    title.textContent = messages.title;
    title.style.fontSize = "18px";
    title.style.color = themeColors.textPrimary;
    title.style.fontWeight = "700";
    title.style.fontFamily = "'Roboto'";
    title.style.lineHeight = "20px";
    title.style.textAlign = "center";
    title.style.wordWrap = "break-word";
    title.style.maxWidth = "100%";
    column.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.textContent = messages.subtitle;
    subtitle.style.fontFamily = "'Roboto'";
    subtitle.style.fontWeight = "400";
    subtitle.style.fontSize = "14px";
    subtitle.style.lineHeight = "16px";
    subtitle.style.textAlign = "center";
    subtitle.style.color = "#AAAAAA";
    subtitle.style.maxWidth = "100%";
    subtitle.style.wordWrap = "break-word";
    column.appendChild(subtitle);

    const loadingImgWrap = document.createElement("div");
    const loadingImg = document.createElement("img");
    loadingImg.src = themeColors.loadingGif;
    loadingImg.style.width = "200px";
    loadingImg.style.height = "200px";

    loadingImgWrap.appendChild(loadingImg);
    column.appendChild(loadingImgWrap);
  }

  private getSuccessMessages(message: string): { title: string; subtitle: string } {
    if (message.includes("Connected")) {
      return {
        title: "Wallet successfully connected.",
        subtitle: "You can now use GM Wallet."
      };
    } else if (message.includes("Transaction")) {
      return {
        title: "Transaction completed.",
        subtitle: "Your transaction has been processed."
      };
    } else if (message.includes("PersonalSign")) {
      return {
        title: "Message signed successfully.",
        subtitle: "Your signature has been created."
      };
    } else if (message.includes("SignTypedDataV4")) {
      return {
        title: "Data signed successfully.",
        subtitle: "Your signature has been created."
      };
    } else {
      return {
        title: "Operation completed successfully.",
        subtitle: "Your request has been processed."
      };
    }
  }

  private showSuccessState(message: string): void {
    console.log("Success:", message);
    
    const modal = document.getElementById("gmwallet_modal_component");
    const column = document.getElementById("column");
    
    if (!modal || !column) return;
    
    const themeColors = this.getThemeColors();
    const messages = this.getSuccessMessages(message);

    column.innerHTML = "";
    
    if (this.modalState.isAndroid || this.modalState.isIos) {
      // Mobile
      modal.style.width = "360px";
      modal.style.height = "174px";
      modal.style.left = "calc(50% - 360px/2)";
      modal.style.bottom = "0px";
      modal.style.borderRadius = "16px 16px 0px 0px";
      modal.style.padding = "24px 16px";
    } else {
      // Desktop
      modal.style.width = "360px";
      modal.style.height = "174px";
      modal.style.padding = "24px 16px";
      modal.style.gap = "24px";
      modal.style.minWidth = "360px";
      modal.style.maxWidth = "360px";
      modal.style.minHeight = "174px";
      modal.style.borderRadius = "16px";
    }

    // Title
    const title = document.createElement("div");
    title.textContent = messages.title;
    title.style.width = "328px";
    title.style.height = "18px";
    title.style.fontFamily = "'Roboto'";
    title.style.fontStyle = "normal";
    title.style.fontWeight = "700";
    title.style.fontSize = "18px";
    title.style.lineHeight = "18px";
    title.style.textAlign = "center";
    title.style.color = themeColors.textPrimary;
    title.style.flex = "none";
    title.style.order = "0";
    title.style.flexGrow = "0";
    column.appendChild(title);

    // Subtitle
    const subtitle = document.createElement("div");
    subtitle.textContent = messages.subtitle;
    subtitle.style.width = "328px";
    subtitle.style.height = "16px";
    subtitle.style.fontFamily = "'Roboto'";
    subtitle.style.fontStyle = "normal";
    subtitle.style.fontWeight = "400";
    subtitle.style.fontSize = "14px";
    subtitle.style.lineHeight = "16px";
    subtitle.style.textAlign = "center";
    subtitle.style.color = "#AAAAAA";
    subtitle.style.flex = "none";
    subtitle.style.order = "1";
    subtitle.style.alignSelf = "stretch";
    subtitle.style.flexGrow = "0";
    column.appendChild(subtitle);

    // Success Icon Container
    const iconContainer = document.createElement("div");
    iconContainer.style.display = "flex";
    iconContainer.style.flexDirection = "row";
    iconContainer.style.justifyContent = "center";
    iconContainer.style.alignItems = "center";
    iconContainer.style.padding = "0px";
    iconContainer.style.width = "44px";
    iconContainer.style.height = "44px";
    iconContainer.style.flex = "none";
    iconContainer.style.order = "2";
    iconContainer.style.flexGrow = "0";

    // Success Icon
    const successIcon = document.createElement("img");
    successIcon.src = themeColors.successIcon;
    successIcon.style.width = "44px";
    successIcon.style.height = "44px";
    successIcon.style.flex = "none";
    successIcon.style.order = "0";
    successIcon.style.flexGrow = "1";
    iconContainer.appendChild(successIcon);
    
    column.appendChild(iconContainer);

    // Auto close after 2 seconds
    setTimeout(() => this.hide(), 2000);
  }

  private getErrorMessages(message: string): { title: string; subtitle: string } {
    if (message.includes("Connection") || message.includes("connect")) {
      return {
        title: "Connection failed.",
        subtitle: "Please try connecting again."
      };
    } else if (message.includes("Transaction") || message.includes("transaction")) {
      return {
        title: "Transaction failed.",
        subtitle: "Please try again or check your wallet."
      };
    } else if (message.includes("Sign") || message.includes("sign")) {
      return {
        title: "Signing failed.",
        subtitle: "Please try again."
      };
    } else {
      return {
        title: "Operation failed.",
        subtitle: "Please try again."
      };
    }
  }

  private showErrorState(message: string): void {
    console.log("Error:", message);
    
    const modal = document.getElementById("gmwallet_modal_component");
    const column = document.getElementById("column");
    
    if (!modal || !column) return;
    
    const themeColors = this.getThemeColors();
    const messages = this.getErrorMessages(message);

    column.innerHTML = "";
    
    if (this.modalState.isAndroid || this.modalState.isIos) {
      // Mobile
      modal.style.width = "360px";
      modal.style.height = "174px";
      modal.style.left = "calc(50% - 360px/2)";
      modal.style.bottom = "0px";
      modal.style.borderRadius = "16px 16px 0px 0px";
      modal.style.padding = "24px 16px";
    } else {
      // Desktop
      modal.style.width = "360px";
      modal.style.height = "174px";
      modal.style.padding = "24px 16px";
      modal.style.gap = "24px";
      modal.style.minWidth = "360px";
      modal.style.maxWidth = "360px";
      modal.style.minHeight = "174px";
      modal.style.borderRadius = "16px";
    }

    // Title
    const title = document.createElement("div");
    title.textContent = messages.title;
    title.style.width = "328px";
    title.style.height = "18px";
    title.style.fontFamily = "'Roboto'";
    title.style.fontStyle = "normal";
    title.style.fontWeight = "700";
    title.style.fontSize = "18px";
    title.style.lineHeight = "18px";
    title.style.textAlign = "center";
    title.style.color = themeColors.textPrimary;
    title.style.flex = "none";
    title.style.order = "0";
    title.style.flexGrow = "0";
    column.appendChild(title);

    // Subtitle
    const subtitle = document.createElement("div");
    subtitle.textContent = messages.subtitle;
    subtitle.style.width = "328px";
    subtitle.style.height = "16px";
    subtitle.style.fontFamily = "'Roboto'";
    subtitle.style.fontStyle = "normal";
    subtitle.style.fontWeight = "400";
    subtitle.style.fontSize = "14px";
    subtitle.style.lineHeight = "16px";
    subtitle.style.textAlign = "center";
    subtitle.style.color = "#AAAAAA";
    subtitle.style.flex = "none";
    subtitle.style.order = "1";
    subtitle.style.alignSelf = "stretch";
    subtitle.style.flexGrow = "0";
    column.appendChild(subtitle);

    // Error Icon Container
    const iconContainer = document.createElement("div");
    iconContainer.style.display = "flex";
    iconContainer.style.flexDirection = "row";
    iconContainer.style.justifyContent = "center";
    iconContainer.style.alignItems = "center";
    iconContainer.style.padding = "0px";
    iconContainer.style.width = "44px";
    iconContainer.style.height = "44px";
    iconContainer.style.flex = "none";
    iconContainer.style.order = "2";
    iconContainer.style.flexGrow = "0";

    // Error Icon
    const errorIcon = document.createElement("img");
    errorIcon.src = themeColors.errorIcon;
    errorIcon.style.width = "44px";
    errorIcon.style.height = "44px";
    errorIcon.style.flex = "none";
    errorIcon.style.order = "0";
    errorIcon.style.flexGrow = "1";
    iconContainer.appendChild(errorIcon);
    
    column.appendChild(iconContainer);

    setTimeout(() => this.hide(), 3000);
  }

  private addEventListeners(background: HTMLElement): void {
    background.addEventListener("click", () => {
      this.closeModal();
    });
  }

  private addModalWrapEventListener(modalWrap: HTMLElement): void {
    modalWrap.addEventListener("click", (e) => {
      if (e.target === modalWrap) {
        this.closeModal();
      }
    });
  }

  private closeModal(): void {
    if (this.modalState.setIntervalNum) {
      clearInterval(this.modalState.setIntervalNum);
    }

    if (this.modalState.isAndroid || this.modalState.isIos) {
      const modalWrap = document.getElementById("gmwallet_modalWrap_wrap");
      if (modalWrap) {
        modalWrap.style.animation =
          "mobileModalClose 0.3s ease-in-out forwards";
      }
    }

    setTimeout(() => {
      this.hide();
      this.closeCallback();
    }, 300);
  }

  private setContainerStyles(element: HTMLElement): void {
    element.style.all = "unset";
    element.style.boxSizing = "border-box";
    element.style.padding = "0";
    element.style.margin = "0";
    element.style.position = "fixed";
    element.style.top = "0";
    element.style.left = "0";
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.zIndex = "999";
  }

  private setBackgroundStyles(element: HTMLElement): void {
    element.style.position = "absolute";
    element.style.top = "0";
    element.style.left = "0";
    element.style.width = "100vw";
    element.style.height = "100%";
    element.style.zIndex = "0";
    element.style.backgroundColor = "rgba(0,0,0,0.3)";
    element.style.backdropFilter = "blur(2px)";
    element.style.cursor = "pointer";
  }

  private setModalStyles(element: HTMLElement): void {
    const themeColors = this.getThemeColors();
    element.style.backgroundColor = themeColors.modalBackground;
    element.style.display = "flex";
    element.style.flexDirection = "column";
    element.style.alignItems = "center";
    element.style.boxShadow = "0px 0px 20px rgba(0, 0, 0, 0.3)";
    element.style.borderRadius = "16px";
    element.style.padding = "32px 16px";
    element.style.gap = "20px";
    element.style.position = "absolute";
    element.style.pointerEvents = "auto";

    if (this.modalState.isAndroid || this.modalState.isIos) {
      element.style.borderTopLeftRadius = "16px";
      element.style.borderTopRightRadius = "16px";
      element.style.borderRadius = "16px 16px 0px 0px";
      element.style.width = "360px";
      element.style.height = "auto";
      element.style.maxHeight = "70vh";
      element.style.minHeight = "200px";
      element.style.left = "calc(50% - 360px/2)";
      element.style.bottom = "0px";
      element.style.padding = "24px 16px";
      this.addMobileAnimations();
    } else {
      element.style.minWidth = "360px";
      element.style.maxWidth = "480px";
      element.style.width = "auto";
      element.style.height = "auto";
      element.style.minHeight = "346px";
      element.style.left = "50%";
      element.style.top = "50%";
      element.style.transform = "translate(-50%, -50%)";
    }
  }

  private setModalWrapStyles(element: HTMLElement): void {
    if (this.modalState.isAndroid || this.modalState.isIos) {
      element.style.position = "absolute";
      element.style.right = "0";
      element.style.left = "0";
      element.style.bottom = "0";
      element.style.zIndex = "1";
      element.style.animation = "mobileModalOpen 0.3s ease-in-out forwards";
    } else {
      element.style.position = "relative";
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.zIndex = "1";
    }
  }

  private setColumnStyles(element: HTMLElement): void {
    element.style.display = "flex";
    element.style.flexDirection = "column";
    element.style.alignItems = "center";
    element.style.width = "100%";
    element.style.gap = "24px";
    
    if (this.modalState.isAndroid || this.modalState.isIos) {
      element.style.justifyContent = "flex-start";
      element.style.overflowY = "auto";
      element.style.maxHeight = "100%";
      element.style.paddingTop = "16px";
    } else {
      element.style.justifyContent = "center";
    }
  }

  private addMobileAnimations(): void {
    const style = document.createElement("style");
    style.type = "text/css";
    style.innerHTML = `
      @keyframes mobileModalOpen {
          0% { bottom: -100%; }
          100% { bottom: 0%; }
      }
      @keyframes mobileModalClose {
          0% { bottom: 0%; }
          100% { bottom: -100%; }
      }
    `;
    document.head.appendChild(style);
  }

  private addResetStyles(container: HTMLElement): void {
    const resetStyle = document.createElement("style");
    resetStyle.type = "text/css";
    resetStyle.innerHTML = `
    #gmwallet_modal {
      all: unset;
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      border: 0;
      font: inherit;
      vertical-align: baseline;
    }

    #gmwallet_modal img {
      display: block;
      max-width: 100%;
    }

    #gmwallet_modal div {
      box-sizing: border-box;
    }
  `;
    container.appendChild(resetStyle);
  }
}
