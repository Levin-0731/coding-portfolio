export class Analytics {
  constructor() {
    this.measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    this.apiSecret = import.meta.env.VITE_GA_API_SECRET;
  }

  sendEvent(eventName, params = {}) {
    try {
      const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`;

      const payload = {
        client_id: this.getClientId(),
        non_personalized_ads: true,
        events: [{
          name: eventName,
          params: {
            ...params,
            engagement_time_msec: "100",
            session_id: Date.now().toString(),
          },
        }],
      };

      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        credentials: "omit",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("GA4 事件发送错误:", error);
    }
  }

  getClientId() {
    let clientId = localStorage.getItem("ga_client_id");
    if (!clientId) {
      clientId = crypto.randomUUID();
      localStorage.setItem("ga_client_id", clientId);
    }
    return clientId;
  }
}

export const analytics = new Analytics();
