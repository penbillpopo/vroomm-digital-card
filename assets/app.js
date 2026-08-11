const { createApp } = Vue;

const DESIGN_WIDTH = 1180;
const DESIGN_HEIGHT = 2556;
const SLIDE_COUNT = 2;
const TRANSITION_MS = 900;
const WHEEL_THRESHOLD = 32;
const SWIPE_THRESHOLD = 80;
const API_URL_PARAM = "api";
const CARD_ID_PARAM = "id";
const DEFAULT_CARD_ID = "elly";
const DEFAULT_API_BASE_URL =
  "https://script.google.com/macros/s/AKfycbzLCaq7G-PXHKSqVEaQb6-dNpU6ILo4NzAE-KB69WxHzrgU5FwBazHVTwbQqmVUEHWr/exec";
const ABOUT_ACCORDION_TEXT =
  "VROOMM 是一家以品牌視覺治理為核心的Visual Consultancy。我們從品牌策略與商業目標出發，全盤統籌視覺識別、內容溝通、數位體驗、空間與產品等品牌接觸點，建立一致、可持續發展的品牌視覺系統";
const SERVICES_ACCORDION_TEXT = [
  "品牌策略與治理",
  "視覺識別與品牌系統",
  "內容溝通與 Campaign 視覺",
  "數位體驗與網站介面",
  "空間與產品接觸點整合",
];

function isUsableUrl(value) {
  return typeof value === "string" && /^https?:\/\//.test(value) && !value.includes("...");
}

function resolveApiUrl() {
  const url = new URL(window.location.href);
  const queryValue = url.searchParams.get(API_URL_PARAM);
  const cardId = url.searchParams.get(CARD_ID_PARAM) || DEFAULT_CARD_ID;

  if (queryValue) {
    return appendUrlParam(queryValue, CARD_ID_PARAM, cardId);
  }

  return `${DEFAULT_API_BASE_URL}?id=${encodeURIComponent(cardId)}`;
}

function appendUrlParam(urlString, key, value) {
  const url = new URL(urlString);
  url.searchParams.set(key, value);
  return url.toString();
}

function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("09") && digits.length === 10) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  if (digits.startsWith("8869") && digits.length === 12) {
    return `0${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  if (digits.startsWith("886") && digits.length === 11) {
    return `0${digits.slice(3, 5)}-${digits.slice(5, 8)}-${digits.slice(8)}`;
  }

  return value || "";
}

function toTelPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("09") && digits.length === 10) {
    return `+886${digits.slice(1)}`;
  }

  if (digits.startsWith("886") && digits.length >= 11) {
    return `+${digits}`;
  }

  return value || "";
}

function resolveRecordValue(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function buildDynamicPractices(record, fallbackItems) {
  const rawValue = resolveRecordValue(record, [
    "practices",
    "practiceList",
    "practice",
  ]);

  if (!rawValue) {
    return fallbackItems;
  }

  const practiceList = rawValue
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [en = "", zh = ""] = item.split(",").map((part) => part.trim());
      return { en, zh };
    })
    .filter((item) => item.en || item.zh);

  return practiceList.length ? practiceList : fallbackItems;
}

function buildServiceList(value, fallbackItems) {
  const services = String(value || "")
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);

  return services.length ? services : fallbackItems;
}

createApp({
  data() {
    return {
      apiUrl: resolveApiUrl(),
      scale: 1,
      activeSlide: 0,
      isAnimating: false,
      isLoading: true,
      touchStartY: 0,
      touchEndY: 0,
      portraitUrl: "",
      activeAccordion: "about",
      aboutAccordionText: ABOUT_ACCORDION_TEXT,
      servicesAccordionText: SERVICES_ACCORDION_TEXT,
      bookingUrl: "",
      person: {
        name: "",
        title: "",
        instagram: "",
        phone: "",
        email: "",
        website: "",
      },
      company: {
        title: "",
        subtitle: "",
        introHeading: "VROOMM 是視覺顧問公司",
        introParagraphs: [],
        practiceHeading: "PRACTICE 服務項目",
        practices: [
          { en: "00 | Visual Consultancy", zh: "視覺顧問" },
          { en: "01 | Brand & Identity", zh: "品牌識別" },
          { en: "02 | Campaign & Content", zh: "主視覺內容" },
          { en: "03 | Image & Motion", zh: "影像動態" },
          { en: "04 | Digital & Experience", zh: "數位體驗" },
          { en: "05 | Object & Space", zh: "物件空間" },
        ],
        contactHeading: "CONTACT 聯絡我們",
        contacts: [
          {
            label: "Instgram",
            value: "",
            href: "",
          },
          {
            label: "Website",
            value: "",
            href: "",
          },
          {
            label: "Email",
            value: "",
            href: "",
          },
          {
            label: "統一編號",
            value: "",
          },
          {
            label: "Address",
            value: "",
          },
        ],
      },
    };
  },
  computed: {
    stageStyle() {
      return {
        width: `${DESIGN_WIDTH * this.scale}px`,
        height: `${DESIGN_HEIGHT * this.scale}px`,
      };
    },
    canvasStyle() {
      return {
        transform: `scale(${this.scale})`,
      };
    },
    sliderTrackStyle() {
      return {
        transform: `translateY(-${this.activeSlide * DESIGN_HEIGHT}px)`,
      };
    },
  },
  mounted() {
    this.updateScale();
    window.addEventListener("resize", this.updateScale);
    window.visualViewport?.addEventListener("resize", this.updateScale);
    window.addEventListener("wheel", this.handleWheel, { passive: false });
    window.addEventListener("keydown", this.handleKeydown);
    this.loadCardData();
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.updateScale);
    window.visualViewport?.removeEventListener("resize", this.updateScale);
    window.removeEventListener("wheel", this.handleWheel);
    window.removeEventListener("keydown", this.handleKeydown);
  },
  methods: {
    isUsableUrl(value) {
      return isUsableUrl(value);
    },
    updateScale() {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty(
        "--app-height",
        `${viewportHeight}px`,
      );
      this.scale = viewportHeight / DESIGN_HEIGHT;
    },
    goToSlide(nextSlide) {
      const targetSlide = Math.max(0, Math.min(SLIDE_COUNT - 1, nextSlide));
      if (targetSlide === this.activeSlide || this.isAnimating) {
        return;
      }

      this.activeSlide = targetSlide;
      this.isAnimating = true;

      window.setTimeout(() => {
        this.isAnimating = false;
      }, TRANSITION_MS);
    },
    stepSlide(direction) {
      this.goToSlide(this.activeSlide + direction);
    },
    toggleAccordion(section) {
      this.activeAccordion = this.activeAccordion === section ? "" : section;
    },
    isAccordionOpen(section) {
      return this.activeAccordion === section;
    },
    handleWheel(event) {
      if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) {
        return;
      }

      event.preventDefault();
      this.stepSlide(event.deltaY > 0 ? 1 : -1);
    },
    handleKeydown(event) {
      if (
        ["ArrowDown", "PageDown", " ", "ArrowUp", "PageUp"].includes(event.key)
      ) {
        event.preventDefault();
      }

      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        this.stepSlide(1);
      }

      if (event.key === "ArrowUp" || event.key === "PageUp") {
        this.stepSlide(-1);
      }
    },
    handleTouchStart(event) {
      this.touchStartY = event.changedTouches[0].clientY;
      this.touchEndY = this.touchStartY;
    },
    handleTouchEnd(event) {
      this.touchEndY = event.changedTouches[0].clientY;
      const deltaY = this.touchStartY - this.touchEndY;

      if (Math.abs(deltaY) < SWIPE_THRESHOLD) {
        return;
      }

      this.stepSlide(deltaY > 0 ? 1 : -1);
    },
    toTelPhone(value) {
      return toTelPhone(value);
    },
    applyCardData(record) {
      const unifiedNumber = resolveRecordValue(record, [
        "unifiedNumber",
        "taxId",
        "businessNumber",
        "companyTaxId",
      ]);
      const address = resolveRecordValue(record, [
        "address",
        "companyAddress",
      ]);
      const aboutText = resolveRecordValue(record, ["aboutText", "about"]);
      const services = resolveRecordValue(record, ["services", "serviceList"]);

      this.aboutAccordionText = aboutText || ABOUT_ACCORDION_TEXT;
      this.servicesAccordionText = buildServiceList(
        services,
        SERVICES_ACCORDION_TEXT,
      );
      this.bookingUrl = resolveRecordValue(record, ["bookingUrl", "bookMeetingUrl"]);

      this.person = {
        ...this.person,
        name: record.name || "",
        title: record.title || "",
        instagram: record.instagram || "",
        phone: formatPhone(record.phone || ""),
        email: record.email || "",
        website: record.website || "",
      };

      this.company = {
        ...this.company,
        title: record.companyTitle || "",
        subtitle: record.companySubtitle || "",
        practices: buildDynamicPractices(record, this.company.practices),
        introParagraphs: [record.intro1, record.intro2].filter(Boolean).length
          ? [record.intro1, record.intro2].filter(Boolean)
          : [],
        contacts: this.company.contacts.map((item) => {
          if (item.label === "Instgram") {
            const instagram = record.instagram || "";
            return {
              ...item,
              value: instagram,
              href: instagram ? `https://www.instagram.com/${instagram.replace(/^@/, "")}/` : "",
            };
          }

          if (item.label === "Website") {
            const website = record.website || "";
            return {
              ...item,
              value: website,
              href: website
                ? /^https?:\/\//.test(website)
                  ? website
                  : `https://${website}`
                : "",
            };
          }

            if (item.label === "Email") {
              const email = record.email || "";
              return {
                ...item,
                value: email,
                href: email ? `mailto:${email}` : "",
              };
            }

            if (item.label === "統一編號") {
              return {
                ...item,
                value: unifiedNumber,
              };
            }

            if (item.label === "Address") {
              return {
                ...item,
                value: address,
              };
            }

            return item;
          }),
      };

      if (isUsableUrl(record.portraitUrl)) {
        this.portraitUrl = record.portraitUrl;
      }
    },
    loadCardDataJsonp() {
      return new Promise((resolve, reject) => {
        const callbackName = `__vroommCard_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const script = document.createElement("script");
        const cleanup = () => {
          delete window[callbackName];
          script.remove();
        };

        window[callbackName] = (payload) => {
          cleanup();
          resolve(payload);
        };

        script.onerror = () => {
          cleanup();
          reject(new Error("JSONP request failed"));
        };

        script.src = appendUrlParam(this.apiUrl, "callback", callbackName);
        document.body.appendChild(script);
      });
    },
    async loadCardData() {
      if (!this.apiUrl) {
        this.isLoading = false;
        return;
      }

      try {
        const payload = await this.loadCardDataJsonp();
        const record = Array.isArray(payload) ? payload[0] : payload;

        if (!record || record.error) {
          throw new Error(record?.error || "Card data is empty");
        }
        this.applyCardData(record);
      } catch (error) {
        console.error("Failed to load card data:", error);
      } finally {
        this.isLoading = false;
      }
    },
  },
  template: `
    <main
      class="page-shell"
      aria-label="VROOMM 電子名片"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <transition name="loader-fade">
        <div v-if="isLoading" class="loading-screen" aria-label="Loading">
          <div class="loading-brand">
            <img class="loading-symbol" src="./assets/images/vroomm-symbol.svg" alt="" aria-hidden="true" />
            <img class="loading-wordmark" src="./assets/images/vroomm-wordmark.svg" alt="VROOMM" />
          </div>
        </div>
      </transition>

      <section class="stage-frame" :style="stageStyle">
        <div class="design-canvas design-canvas--slider" :style="canvasStyle">
          <div
            class="slider-track"
            :class="{ 'is-animating': isAnimating }"
            :style="sliderTrackStyle"
          >
            <section class="panel panel--card" aria-label="電子名片封面">
              <img class="brand-symbol" src="./assets/images/vroomm-symbol.svg" alt="" aria-hidden="true" />

              <header class="brand-copy">
                <h1 class="brand-title">
                  <span>VROOMM</span>
                  <span>Visual Consultancy</span>
                </h1>
                <p class="brand-subtitle">
                  Visual Consultancy. We shape how brands are seen,
                  understood and chosen.
                </p>
              </header>

              <figure v-if="portraitUrl" class="portrait-frame">
                <img
                  class="portrait-image"
                  :src="portraitUrl"
                  referrerpolicy="no-referrer"
                  alt="Portrait of Elly Lin"
                />
              </figure>

              <section class="contact-block" aria-label="Contact information">
                <div class="contact-row contact-row--name">
                  <h2 class="contact-name">{{ person.name }}</h2>
                  <p class="contact-role">{{ person.title }}</p>
                </div>

                <div class="contact-row contact-row--social">
                  <p class="contact-instagram">{{ person.instagram }}</p>
                  <p class="contact-label">IG</p>
                </div>

                <a class="contact-link contact-link--phone" :href="'tel:' + toTelPhone(person.phone)">
                  {{ person.phone }}
                </a>
                <a class="contact-link contact-link--email" :href="'mailto:' + person.email">
                  {{ person.email }}
                </a>
                <a
                  class="contact-link contact-link--website"
                  :href="/^https?:\\/\\//.test(person.website) ? person.website : 'https://' + person.website"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ person.website }}
                </a>
              </section>

              <button
                class="slide-arrow"
                type="button"
                aria-label="下一頁"
                @click="goToSlide(1)"
              >
                <img src="./assets/images/chevron.svg" alt="" aria-hidden="true" />
              </button>
            </section>

            <section class="panel panel--about" aria-label="VROOMM 公司介紹">
              <button
                class="about-back-button"
                type="button"
                aria-label="上一頁"
                @click="goToSlide(0)"
              >
                <img src="./assets/images/chevron.svg" alt="" aria-hidden="true" />
              </button>

              <div class="about-page-copy">
                <h2 class="about-page-title">吾潤視覺顧問公司</h2>
                <p class="about-page-summary">VROOMM 是視覺顧問公司</p>
                <p class="about-page-summary">以策略判斷與統一審美，讓品牌的每一次出現</p>
                <p class="about-page-summary">都成為被選擇的理由</p>
              </div>

              <section class="accordion-group" aria-label="About sections">
                <section class="accordion-section" :class="{ 'is-open': isAccordionOpen('about') }">
                  <button
                    class="accordion-trigger"
                    type="button"
                    :aria-expanded="isAccordionOpen('about') ? 'true' : 'false'"
                    aria-controls="about-panel"
                    @click="toggleAccordion('about')"
                  >
                    <span class="accordion-title">ABOUT</span>
                    <img
                      class="accordion-icon"
                      :class="{ 'is-open': isAccordionOpen('about') }"
                      src="./assets/images/chevron.svg"
                      alt=""
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    v-show="isAccordionOpen('about')"
                    id="about-panel"
                    class="accordion-panel"
                  >
                    <p class="accordion-copy">{{ aboutAccordionText }}</p>
                  </div>
                </section>

                <section class="accordion-section" :class="{ 'is-open': isAccordionOpen('services') }">
                  <button
                    class="accordion-trigger"
                    type="button"
                    :aria-expanded="isAccordionOpen('services') ? 'true' : 'false'"
                    aria-controls="services-panel"
                    @click="toggleAccordion('services')"
                  >
                    <span class="accordion-title">SERVICES</span>
                    <img
                      class="accordion-icon"
                      :class="{ 'is-open': isAccordionOpen('services') }"
                      src="./assets/images/chevron.svg"
                      alt=""
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    v-show="isAccordionOpen('services')"
                    id="services-panel"
                    class="accordion-panel accordion-panel--services"
                  >
                    <p v-for="item in servicesAccordionText" :key="item" class="accordion-copy accordion-copy--service">
                      {{ item }}
                    </p>
                  </div>
                </section>

                <section class="accordion-section accordion-section--static">
                  <a
                    v-if="isUsableUrl(bookingUrl)"
                    class="accordion-trigger accordion-trigger--static"
                    :href="bookingUrl"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span class="accordion-title">BOOK A MEETING</span>
                  </a>
                  <div v-else class="accordion-trigger accordion-trigger--static">
                    <span class="accordion-title">BOOK A MEETING</span>
                  </div>
                </section>
              </section>

              <section class="about-footer" aria-label="Company contact summary">
                <div class="about-footer-row about-footer-row--brand">
                  <h3 class="about-footer-brand">VROOMM</h3>
                  <p class="about-footer-meta">Visual Consultancy</p>
                </div>
                <div class="about-footer-row">
                  <p class="about-footer-primary">@vroomm.co</p>
                  <p class="about-footer-meta">IG</p>
                </div>
                <div class="about-footer-row">
                  <p class="about-footer-primary">000633108</p>
                  <p class="about-footer-meta">VAT</p>
                </div>
                <div class="about-footer-row about-footer-row--stack">
                  <p class="about-footer-primary">vroomm@vroomm.com</p>
                </div>
                <div class="about-footer-row about-footer-row--stack">
                  <p class="about-footer-primary">www.vroomm.com</p>
                </div>
              </section>

              <div class="about-bottom-brand" aria-hidden="true">
                <img class="about-bottom-wordmark" src="./assets/images/vroomm-wordmark-bottom.svg" alt="" />
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  `,
}).mount("#app");
