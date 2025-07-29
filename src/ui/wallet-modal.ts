import QRCode from "qrcode";
import { ModalStatusType } from "../utils/types";

import Loading from "../assets/images/connect_loading.gif";
import Refresh from "../assets/images/refresh.svg";
import TimerImg from "../assets/images/timer.svg";

export interface WalletModalOptions {
  subTitleText?: string;
  connectImgUrl?: string;
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
  private maxTime: number = 60 * 5;
  private refreshCallback: () => Promise<string> = async () => "";
  private closeCallback: () => void = () => {};
  private globalOption: WalletModalOptions;

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

  show(
    gmWalletUrl: string,
    options: WalletModalOptions = {},
    onRefresh: () => Promise<string>,
    onClose: () => void
  ): void {
    if (typeof window === "undefined") return;
    this.globalOption = options;
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

    if (type === "connecting") {
      this.showConnectingState(message);
    } else if (type === "success") {
      this.showSuccessState(message);
    } else if (type === "error") {
      this.hide();
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

    document.body.appendChild(allContainer);
    document.body.style.overflow = "hidden";
  }

  private createModalContent(
    column: HTMLElement,
    gmWalletUrl: string,
    options: WalletModalOptions
  ): void {
    const title = document.createElement("div");
    title.id = "title";
    title.textContent = "Scan with the GM Wallet";
    title.style.fontSize = "16px";
    title.style.color = "#fff";
    title.style.fontWeight = "700";

    if (options.subTitleText) {
      const subTitle = document.createElement("div");
      subTitle.id = "subTitleText";
      subTitle.textContent = options.subTitleText;
      subTitle.style.fontSize = this.modalState.isWeb ? "16px" : "20px";
      subTitle.style.color = "#fff";
      subTitle.style.fontWeight = "700";
      subTitle.style.textAlign = "center";
      column.appendChild(subTitle);
    }

    if (this.modalState.isWeb) {
      column.appendChild(title);
      this.createQRCode(column, gmWalletUrl);
      this.createTimer(column);
    } else {
      const loadingImgWrap = document.createElement("div");
      const loadingImg = document.createElement("img");
      loadingImg.src = Loading;
      loadingImg.style.width = "44px";
      loadingImg.style.height = "44px";

      loadingImgWrap.appendChild(loadingImg);
      column.appendChild(loadingImgWrap);
    }
  }

  private createQRCode(column: HTMLElement, gmWalletUrl: string): void {
    const qr = document.createElement("div");
    qr.id = "qr";
    qr.style.position = "relative";
    qr.style.borderRadius = "10px";
    qr.style.overflow = "hidden";

    const img = document.createElement("img");
    QRCode.toDataURL(gmWalletUrl)
      .then((url) => {
        img.src = url;
        img.style.width = "280px";
        img.style.height = "280px";
        img.style.border = "4px solid #465aa7";
        img.style.borderRadius = "10px";
        qr.appendChild(img);
      })
      .catch((err) => {
        console.error("QR Code generation failed:", err);
      });

    column.appendChild(qr);
  }

  private createTimer(column: HTMLElement): void {
    const timer = document.createElement("div");
    timer.id = "timer";
    timer.style.display = "flex";
    timer.style.alignItems = "center";
    timer.style.justifyContent = "center";
    timer.style.gap = "5px";
    timer.style.fontSize = "14px";
    timer.style.color = "#fff";
    timer.style.fontWeight = "400";

    const timerIcon = document.createElement("img");
    timerIcon.src = TimerImg;
    timerIcon.style.width = "14px";
    timerIcon.style.height = "14px";
    timer.appendChild(timerIcon);

    const timerText = document.createElement("div");
    timer.appendChild(timerText);
    column.appendChild(timer);
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
        timer!.style.color = "#ec0c0c";
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
    if (!qr) return;

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
    refreshOuter.style.backgroundColor = "rgba(0,0,0,0.5)";
    refreshOuter.style.cursor = "pointer";
    refreshOuter.style.display = "flex";
    refreshOuter.style.justifyContent = "center";
    refreshOuter.style.alignItems = "center";

    const refreshIcon = document.createElement("img");
    refreshIcon.src = Refresh;
    refreshIcon.style.width = "40px";
    refreshIcon.style.height = "40px";
    refreshIcon.style.pointerEvents = "none";
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
    const existingImg = qr?.querySelector("img");
    const timer = document.getElementById("timer");
    if (timer) {
      timer.style.color = "#fff";
    }

    if (qr && existingImg) {
      try {
        const url = await QRCode.toDataURL(gmWalletUrl);
        existingImg.src = url;
      } catch (err) {
        console.error("QR Code refresh failed:", err);
      }
    }
  }

  private showConnectingState(message: string): void {
    const column = document.getElementById("column");
    if (!column) return;

    column.innerHTML = "";

    if (this.globalOption.subTitleText) {
      const loadingText = document.createElement("div");
      loadingText.textContent = this.globalOption.subTitleText;
      loadingText.style.fontSize = this.modalState.isWeb ? "16px" : "20px";
      loadingText.style.fontWeight = "700";
      loadingText.style.color = "#fff";
      loadingText.style.textAlign = "center";
      loadingText.style.width = "100%";
      column.appendChild(loadingText);
    }

    const loadingText = document.createElement("div");
    loadingText.textContent = message;
    loadingText.style.fontSize = "16px";
    loadingText.style.fontWeight = "700";
    loadingText.style.color = "#fff";
    loadingText.style.textAlign = "center";
    loadingText.style.width = "70%";
    column.appendChild(loadingText);

    const loadingImgWrap = document.createElement("div");
    loadingImgWrap.style.display = "flex";
    loadingImgWrap.style.flexDirection = "column";
    loadingImgWrap.style.alignItems = "center";

    if (this.globalOption.connectImgUrl) {
      const connectImg = document.createElement("img");
      connectImg.src = this.globalOption.connectImgUrl;
      connectImg.style.width = this.modalState.isWeb ? "280px" : "150px";
      connectImg.style.height = this.modalState.isWeb ? "150px" : "96px";

      loadingImgWrap.appendChild(connectImg);
    }

    const loadingImg = document.createElement("img");
    loadingImg.src = Loading;
    loadingImg.style.width = "44px";
    loadingImg.style.height = "44px";

    loadingImgWrap.appendChild(loadingImg);
    column.appendChild(loadingImgWrap);
  }

  private showSuccessState(message: string): void {
    console.log("Success:", message);
    setTimeout(() => this.hide(), 1000);
  }

  private showErrorState(message: string): void {
    const column = document.getElementById("column");
    if (!column) return;

    const errorText = document.createElement("div");
    errorText.textContent = message;
    errorText.style.fontSize = "16px";
    errorText.style.color = "#ec0c0c";
    errorText.style.textAlign = "center";
    errorText.style.marginTop = "20px";

    column.appendChild(errorText);
  }

  private addEventListeners(background: HTMLElement): void {
    background.addEventListener("click", () => {
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
    });
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
    element.style.backgroundColor = "#333";
    element.style.display = "flex";
    element.style.flexDirection = "column";
    element.style.justifyContent = "center";
    element.style.alignItems = "center";

    if (this.modalState.isAndroid || this.modalState.isIos) {
      element.style.borderTopLeftRadius = "20px";
      element.style.borderTopRightRadius = "20px";
      element.style.padding = "24px 16px";
      element.style.width = "100vw";
      this.addMobileAnimations();
    } else {
      element.style.padding = "16px";
      element.style.borderRadius = "20px";
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
      element.style.position = "absolute";
      element.style.top = "50%";
      element.style.left = "50%";
      element.style.transform = "translate(-50%, -50%) scale(1)";
      element.style.zIndex = "1";
    }
  }

  private setColumnStyles(element: HTMLElement): void {
    element.style.display = "flex";
    element.style.flexDirection = "column";
    element.style.border = "1px solid rgba(255,255,255,0.3)";
    element.style.padding = "20px 16px";
    element.style.borderRadius = "10px";
    element.style.justifyContent = "center";
    element.style.alignItems = "center";
    element.style.width = "100%";
    element.style.gap = "20px";
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
