/**
 * API Client — 统一封装所有后端请求
 */
const API_BASE = '/api';

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const json = await res.json();
  if (!res.ok || json.code !== 0) {
    const err = new Error(json.message || '请求失败');
    err.status = res.status;
    err.errors = json.errors;
    throw err;
  }
  return json.data;
}

const get  = (path)        => request('GET',    path);
const post = (path, body)  => request('POST',   path, body);
const put  = (path, body)  => request('PUT',    path, body);
const del  = (path, body)  => request('DELETE', path, body);

const api = {
  // ── System ────────────────────────────────────────────────
  health: () => get('/health'),
  dashboard: () => get('/analysis/dashboard'),

  // ── Colleges ──────────────────────────────────────────────
  colleges: {
    list: () => get('/colleges'),
  },

  // ── Majors ────────────────────────────────────────────────
  majors: {
    list:   ()       => get('/majors'),
    get:    (id)     => get(`/majors/${id}`),
    create: (data)   => post('/majors', data),
    update: (id, d)  => put(`/majors/${id}`, d),
    remove: (id)     => del(`/majors/${id}`),
  },

  // ── Curriculum ────────────────────────────────────────────
  curriculum: {
    versions:      (majorId) => get(`/curriculum/versions${majorId ? '?major_id=' + majorId : ''}`),
    allVersions:   ()        => get('/curriculum/versions'),
    getVersion:    (id)      => get(`/curriculum/versions/${id}`),
    createVersion: (data)    => post('/curriculum/versions', data),
    /** 从指定版本整包克隆（培养目标、毕业要求、课程、支撑关系等） */
    cloneVersion:  (sourceId, data) => post(`/curriculum/versions/${sourceId}/clone`, data),
    updateVersion: (id, d)   => put(`/curriculum/versions/${id}`, d),
    deleteVersion: (id)      => del(`/curriculum/versions/${id}`),
    getGR:         (vId)     => get(`/curriculum/versions/${vId}/gr`),
    createGR:      (vId, d)  => post(`/curriculum/versions/${vId}/gr`, d),
    createIndicator: (grId, d) => post(`/curriculum/gr/${grId}/indicators`, d),
    updateIndicator: (id, d)   => put(`/curriculum/indicators/${id}`, d),
    supportMatrix:     (vId)   => get(`/curriculum/versions/${vId}/support-matrix`),
    saveSupport:       (data)  => post('/curriculum/support', data),
    removeSupport:     (data)  => del('/curriculum/support', data),
    objGrMatrix:       (vId)   => get(`/curriculum/versions/${vId}/obj-gr-matrix`),
    saveObjGrSupport:  (data)  => post('/curriculum/obj-gr-support', data),
    removeObjGrSupport:(data)  => del('/curriculum/obj-gr-support', data),
    deleteGR:          (id)    => del(`/curriculum/gr/${id}`),
    deleteIndicator:   (id)    => del(`/curriculum/indicators/${id}`),
    deleteObjective:   (id)    => del(`/curriculum/objectives/${id}`),
  },

  // ── Courses ───────────────────────────────────────────────
  courses: {
    list:   (versionId) => get(`/courses?version_id=${versionId}`),
    get:    (id)        => get(`/courses/${id}`),
    create: (data)      => post('/courses', data),
    update: (id, d)     => put(`/courses/${id}`, d),
    remove: (id)        => del(`/courses/${id}`),
  },

  // ── Teaching ──────────────────────────────────────────────
  teaching: {
    classes:        (q = {})    => get(`/teaching/classes?${new URLSearchParams(q)}`),
    createClass:    (data)      => post('/teaching/classes', data),
    ilos:           (classId)   => get(`/teaching/classes/${classId}/ilos`),
    createIlo:      (classId, d)=> post(`/teaching/classes/${classId}/ilos`, d),
    updateIlo:      (id, d)     => put(`/teaching/ilos/${id}`, d),
    assessments:    (classId)   => get(`/teaching/classes/${classId}/assessments`),
    createAssessment: (classId, d) => post(`/teaching/classes/${classId}/assessments`, d),
    importScores:   (data)      => post('/teaching/scores/batch', data),
  },

  // ── Analysis ──────────────────────────────────────────────
  analysis: {
    version:    (vId)     => get(`/analysis/version/${vId}`),
    class:      (classId) => get(`/analysis/class/${classId}`),
    diagnosis:  (vId)     => get(`/analysis/diagnosis/${vId}`),
  },

  // ── Improvement ───────────────────────────────────────────
  improvement: {
    list:        (versionId) => get(`/improvement?version_id=${versionId}`),
    create:      (data)      => post('/improvement', data),
    update:      (id, data)  => put(`/improvement/${id}`, data),
    updateStatus:(id, data)  => put(`/improvement/${id}/status`, data),
    remove:      (id)        => del(`/improvement/${id}`),
  },

  // ── Data Integration ──────────────────────────────────────
  dataIntegration: {
    status:        ()           => get('/data-integration/status'),
    academicSync:  (dataType)   => post('/data-integration/academic/sync', { dataType }),
    importCsv:     (type, rows) => post(`/data-integration/academic/import/${type}`, { rows }),
    lmsConfig:     ()           => get('/data-integration/lms/config'),
    saveLmsConfig: (data)       => put('/data-integration/lms/config', data),
    lmsSync:       ()           => post('/data-integration/lms/sync'),
    industryScrape:(target)     => post('/data-integration/industry/scrape', { target }),
    industryStats: ()           => get('/data-integration/industry/stats'),
    qualityLogs:   (params)     => get(`/data-integration/quality/logs?${new URLSearchParams(params)}`),
    qualityStats:  ()           => get('/data-integration/quality/stats'),
    // ── 数据管理 CRUD ──────────────────────────────────────
    listRecords:   (type, params) => get(`/data-integration/records/${type}?${new URLSearchParams(params)}`),
    createRecord:  (type, data)   => post(`/data-integration/records/${type}`, data),
    updateRecord:  (type, id, data) => put(`/data-integration/records/${type}/${id}`, data),
    deleteRecord:  (type, id)     => del(`/data-integration/records/${type}/${id}`),
  },
};

window.api = api;
