/**
 * External API Endpoints Configuration
 * Define all external API endpoints in one place for easy management
 */

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export enum ResponseType {
  JSON = 'json',
  FILE = 'file', // For downloading files
  BUFFER = 'arraybuffer',
}

export interface ApiEndpoint {
  // Unique identifier for the endpoint
  id: string;
  
  // HTTP method
  method: HttpMethod;
  
  // External API path
  externalPath: string;
  
  // Internal route path (what the client calls)
  internalPath: string;
  
  // Description
  description: string;
  
  // Response type (json, file, etc.)
  responseType?: ResponseType;
  
  // Whether authentication is required
  requiresAuth?: boolean;
  
  // Request body schema/validation (optional)
  requestSchema?: any;
  
  // Response schema (optional)
  responseSchema?: any;
  
  // Query parameters allowed (optional)
  queryParams?: string[];
  
  // URL path parameters (optional) - e.g., ['id', 'userId']
  pathParams?: string[];
  
  // Custom headers to send with request (optional)
  headers?: Record<string, string>;
  
  // Timeout in ms (optional)
  timeout?: number;
  
  // Whether to cache response (optional)
  cacheable?: boolean;
  
  // Cache duration in seconds (optional)
  cacheDuration?: number;
  
  // Custom processor function (optional)
  processor?: (data: any) => any;
}

/**
 * All external API endpoints configuration
 * Add new endpoints here instead of modifying controllers
 */
export const API_ENDPOINTS: Record<string, ApiEndpoint> = {
  // Dealers endpoints
  DEALERS_EXPORT_SERVICE_LOGS: {
    id: 'dealers.export-service-logs',
    method: HttpMethod.GET,
    externalPath: '/api/dealers/export-service-usage-logs',
    internalPath: '/api/dealers/export-service-usage-logs',
    description: 'Export service usage logs for the authenticated dealer as an Excel file',
    responseType: ResponseType.FILE,
    requiresAuth: true,
  },

  // Members endpoints
  MEMBERS_CREATE: {
    id: 'members.create',
    method: HttpMethod.POST,
    externalPath: '/api/members',
    internalPath: '/api/members',
    description: 'Create a new member with specified services and limits',
    requiresAuth: true,
    requestSchema: {
      email: 'string',
      name: 'string',
      services: 'array',
    },
  },

  MEMBERS_LIST: {
    id: 'members.list',
    method: HttpMethod.GET,
    externalPath: '/api/members',
    internalPath: '/api/members',
    description: 'Get a paginated list of members',
    requiresAuth: true,
    queryParams: ['page', 'limit'],
  },

  MEMBERS_ASSIGN_SERVICES: {
    id: 'members.assign-services',
    method: HttpMethod.POST,
    externalPath: '/api/members/services',
    internalPath: '/api/members/services',
    description: 'Assign services to a member',
    requiresAuth: true,
    requestSchema: {
      memberId: 'string',
      services: 'array',
    },
  },

  // Service endpoints
  SERVICE_CREATE_APP_TOTAL_GO: {
    id: 'service.app-total-go.create',
    method: HttpMethod.POST,
    externalPath: '/api/service/app-total-go',
    internalPath: '/api/service/app-total-go',
    description: 'Create a new AppTotalGo service task for mobile app analysis',
    requiresAuth: true,
    requestSchema: {
      appIdentifier: 'string',
      analysisType: 'string',
    },
  },

  SERVICE_APP_TOTAL_GO_STATUS: {
    id: 'service.app-total-go.status',
    method: HttpMethod.GET,
    externalPath: '/api/service/app-total-go/status/:id',
    internalPath: '/api/service/app-total-go/status/:id',
    description: 'Get the status of an AppTotalGo service task',
    requiresAuth: true,
    pathParams: ['id'],
  },

  SERVICE_APP_TOTAL_GO_FILES: {
    id: 'service.app-total-go.files',
    method: HttpMethod.GET,
    externalPath: '/api/service/app-total-go/files/:id',
    internalPath: '/api/service/app-total-go/files/:id',
    description: 'Download the analysis result file from a completed AppTotalGo task',
    requiresAuth: true,
    responseType: ResponseType.FILE,
    pathParams: ['id'],
  },

  SERVICE_APP_TOTAL_GO_HISTORY: {
    id: 'service.app-total-go.history',
    method: HttpMethod.GET,
    externalPath: '/api/service/app-total-go/history',
    internalPath: '/api/service/app-total-go/history',
    description: 'Get AppTotalGo history (analysis task list)',
    requiresAuth: true,
  },
};

/**
 * Get endpoint by ID
 */
export function getEndpoint(id: string): ApiEndpoint | undefined {
  return API_ENDPOINTS[id];
}

/**
 * Get all endpoints
 */
export function getAllEndpoints(): ApiEndpoint[] {
  return Object.values(API_ENDPOINTS);
}

/**
 * Filter endpoints by method
 */
export function getEndpointsByMethod(method: HttpMethod): ApiEndpoint[] {
  return Object.values(API_ENDPOINTS).filter(ep => ep.method === method);
}