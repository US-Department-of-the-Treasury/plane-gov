/* eslint-disable no-useless-catch */

import { API_BASE_URL } from "@plane/constants";
import type {
  TNotificationPaginatedInfo,
  TNotificationPaginatedInfoQueryParams,
  TNotification,
  TUnreadNotificationsCount,
} from "@plane/types";
// helpers
// services
import { APIService } from "@/services/api.service";

export class WorkspaceNotificationService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchUnreadNotificationsCount(workspaceSlug: string): Promise<TUnreadNotificationsCount> {
    try {
      const { data } = await this.get(`/api/workspaces/${workspaceSlug}/users/notifications/unread/`);
      // TanStack Query requires non-undefined return values
      return data ?? { total_unread_notifications_count: 0, mention_unread_notifications_count: 0 };
    } catch (error) {
      throw error;
    }
  }

  async fetchNotifications(
    workspaceSlug: string,
    params: TNotificationPaginatedInfoQueryParams
  ): Promise<TNotificationPaginatedInfo> {
    try {
      const { data } = await this.get(`/api/workspaces/${workspaceSlug}/users/notifications`, {
        params,
      });
      // TanStack Query requires non-undefined return values
      return data ?? { results: [], count: 0, total_pages: 0, extra_stats: null, next_cursor: "", prev_cursor: "", next_page_results: false, prev_page_results: false };
    } catch (error) {
      throw error;
    }
  }

  async updateNotificationById(
    workspaceSlug: string,
    notificationId: string,
    payload: Partial<TNotification>
  ): Promise<TNotification | undefined> {
    try {
      const { data } = await this.patch(
        `/api/workspaces/${workspaceSlug}/users/notifications/${notificationId}/`,
        payload
      );
      return data || undefined;
    } catch (error) {
      throw error;
    }
  }

  async markNotificationAsRead(workspaceSlug: string, notificationId: string): Promise<TNotification | undefined> {
    try {
      const { data } = await this.post(`/api/workspaces/${workspaceSlug}/users/notifications/${notificationId}/read/`);
      return data || undefined;
    } catch (error) {
      throw error;
    }
  }

  async markNotificationAsUnread(workspaceSlug: string, notificationId: string): Promise<TNotification | undefined> {
    try {
      const { data } = await this.delete(
        `/api/workspaces/${workspaceSlug}/users/notifications/${notificationId}/read/`
      );
      return data || undefined;
    } catch (error) {
      throw error;
    }
  }

  async markNotificationAsArchived(workspaceSlug: string, notificationId: string): Promise<TNotification | undefined> {
    try {
      const { data } = await this.post(
        `/api/workspaces/${workspaceSlug}/users/notifications/${notificationId}/archive/`
      );
      return data || undefined;
    } catch (error) {
      throw error;
    }
  }

  async markNotificationAsUnArchived(
    workspaceSlug: string,
    notificationId: string
  ): Promise<TNotification | undefined> {
    try {
      const { data } = await this.delete(
        `/api/workspaces/${workspaceSlug}/users/notifications/${notificationId}/archive/`
      );
      return data || undefined;
    } catch (error) {
      throw error;
    }
  }

  async markAllNotificationsAsRead(
    workspaceSlug: string,
    payload: TNotificationPaginatedInfoQueryParams
  ): Promise<TNotification | undefined> {
    try {
      const { data } = await this.post(`/api/workspaces/${workspaceSlug}/users/notifications/mark-all-read/`, payload);
      return data || undefined;
    } catch (error) {
      throw error;
    }
  }
}

const workspaceNotificationService = new WorkspaceNotificationService();

export default workspaceNotificationService;
