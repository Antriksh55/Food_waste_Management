import axiosInstance from './axiosInstance'

const NOTIF_BASE = 'http://localhost:8084'

export const getNotifications = () =>
  axiosInstance.get(`${NOTIF_BASE}/api/notifications`)
