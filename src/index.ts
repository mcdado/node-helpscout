import axios, { type AxiosInstance } from "axios";

// Defaults
const BASE_URL = "https://api.helpscout.net/v2/";
const RATE_LIMIT = 200; // tightest rate limit possible is 150 ms between calls

export default class HelpScoutClient {
  apiCredentials: HelpScoutClient.ApiCredentials;
  apiTokens: HelpScoutClient.ApiAuthTokens | undefined;
  options: HelpScoutClient.ClientOptions;
  httpClient: AxiosInstance;

  constructor(
    credentials: HelpScoutClient.ApiCredentials,
    options?: HelpScoutClient.OptionsParams
  ) {
    this.apiCredentials = credentials;

    this.options = Object.assign(
      {
        baseUrl: BASE_URL,
        rateLimit: RATE_LIMIT,
      },
      options
    );

    this.httpClient = axios.create({
      baseURL: this.options.baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.httpClient.interceptors.request.use(async (config) => {
      this.apiTokens !== undefined &&
        (config.headers.Authorization = `Bearer ${this.apiTokens.accessToken}`);
      return config;
    });

    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (!axios.isAxiosError(error)) {
          return await Promise.reject(error);
        }

        if (error.config && error.response?.status === 401) {
          this.apiTokens = undefined;
          await this.authenticate();
          return await axios.request(error.config);
        }

        if (error.config && error.response?.status === 429) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.options.rateLimit)
          );
          return await this.httpClient(error.config);
        }

        return await Promise.reject(error);
      }
    );
  }

  async authenticate(): Promise<void> {
    if (
      this.apiTokens === undefined ||
      this.apiTokens.expiresAt <= Date.now()
    ) {
      await this.#fetchAccessToken();
    }
  }

  async #fetchAccessToken(): Promise<HelpScoutClient.ApiAuthTokens> {
    if (
      this.apiCredentials.clientId === "" ||
      this.apiCredentials.clientSecret === ""
    ) {
      throw new Error(
        "Client ID and Client Secret are required to authenticate with HelpScout API"
      );
    }

    const response = await axios({
      url: BASE_URL + "oauth2/token",
      method: "POST",
      params: {
        grant_type: "client_credentials",
        client_id: this.apiCredentials.clientId,
        client_secret: this.apiCredentials.clientSecret,
      },
    });

    this.apiTokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: response.data.expires_in * 1000 + Date.now(),
    };

    return this.apiTokens;
  }

  async sendApiRequest(
    method: HelpScoutClient.HttpMethod,
    url: string,
    data: any = undefined
  ): Promise<any> {
    await this.authenticate();

    const res = await this.httpClient({ url, method, data });

    return res;
  }

  async create(
    resource: string,
    data: any,
    parentResource?: string,
    parentResourceId?: string | number
  ): Promise<any> {
    const parentSegment =
      parentResource !== undefined && parentResourceId !== undefined
        ? `${parentResource}/${parentResourceId}/`
        : "";

    const resourceRes = await this.sendApiRequest(
      "POST",
      BASE_URL + parentSegment + resource,
      data
    );

    return resourceRes.headers["resource-id"];
  }

  async list(
    resource: string,
    queryParams?: any | undefined,
    parentResource?: string,
    parentResourceId?: string | number
  ): Promise<any[]> {
    const parentUrl =
      parentResource !== undefined && parentResourceId !== undefined
        ? `${parentResource}/${parentResourceId}/`
        : "";

    const response = await this.httpClient({
      method: "GET",
      url: BASE_URL + parentUrl + resource,
      params: queryParams,
    });

    return response.data._embedded[resource];
  }

  async get(
    resource: string,
    resourceId: string | number,
    embed?: string[],
    subResource?: string,
    subResourceId?: string | number
  ): Promise<any> {
    const embedQueryStr = embed ? "?embed=" + embed.join("&embed=") : "";

    const subResourceUrl =
      subResource !== undefined && subResourceId !== undefined
        ? `/${subResource}/${subResourceId}/`
        : "";

    const resourceRes = await this.sendApiRequest(
      "GET",
      `${BASE_URL}${resource}/${resourceId}${subResourceUrl}${embedQueryStr}`
    );

    if (
      subResource !== undefined &&
      resourceRes.data?._embedded?.[subResource]
    ) {
      return resourceRes.data._embedded[subResource];
    }

    return resourceRes.data;
  }

  async updatePut(
    resource: string,
    resourceId: string | number,
    data: any,
    parentResource?: string,
    parentResourceId?: string | number
  ): Promise<void> {
    const parentUrl =
      parentResource !== undefined && parentResourceId !== undefined
        ? `${parentResource}/${parentResourceId}/`
        : "";

    await this.sendApiRequest(
      "PUT",
      `${BASE_URL}${parentUrl}${resource}/${resourceId || ""}`,
      data
    );
  }

  async updatePatch(
    resource: string,
    resourceId: string | number,
    data: any,
    parentResource?: string,
    parentResourceId?: string | number
  ): Promise<void> {
    const parentUrl =
      parentResource && parentResourceId
        ? `${parentResource}/${parentResourceId}/`
        : "";

    await this.sendApiRequest(
      "PATCH",
      BASE_URL + parentUrl + resource + "/" + resourceId,
      data
    );
  }

  async delete(resource: string, resourceId: string | number): Promise<void> {
    await this.sendApiRequest("DELETE", BASE_URL + resource + "/" + resourceId);
  }

  async addNoteToConversation(
    conversationId: string | number,
    text: string
  ): Promise<any> {
    return await this.create(
      "notes",
      { text },
      "conversations",
      conversationId
    );
  }
}
