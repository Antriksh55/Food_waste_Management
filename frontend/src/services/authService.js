import axiosInstance from './axiosInstance'

const AUTH_BASE = 'http://localhost:8081'

export const register = (data) =>
  axiosInstance.post(`${AUTH_BASE}/api/auth/register`, data)

export const login = (data) =>
  axiosInstance.post(`${AUTH_BASE}/api/auth/login`, data)

export const getUsers = (page = 0, size = 10) =>
  axiosInstance.get(`${AUTH_BASE}/api/admin/users?page=${page}&size=${size}`)

export const deactivateUser = (id) =>
  axiosInstance.delete(`${AUTH_BASE}/api/admin/users/${id}`)
