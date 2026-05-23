import axiosInstance from './axiosInstance'

const FOOD_BASE = 'http://localhost:8082'

export const getFoods = (page = 0, size = 12) =>
  axiosInstance.get(`${FOOD_BASE}/api/foods?page=${page}&size=${size}`)

export const getMyFoods = () =>
  axiosInstance.get(`${FOOD_BASE}/api/foods/my`)

export const searchFoods = (params) =>
  axiosInstance.get(`${FOOD_BASE}/api/foods/search`, { params })

export const getFoodById = (id) =>
  axiosInstance.get(`${FOOD_BASE}/api/foods/${id}`)

export const createFood = (data) =>
  axiosInstance.post(`${FOOD_BASE}/api/foods`, data)

export const updateFood = (id, data) =>
  axiosInstance.put(`${FOOD_BASE}/api/foods/${id}`, data)

export const deleteFood = (id) =>
  axiosInstance.delete(`${FOOD_BASE}/api/foods/${id}`)
