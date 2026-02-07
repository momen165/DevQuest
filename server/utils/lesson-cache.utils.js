const NodeCache = require("node-cache");

const lessonsCache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: false,
  maxKeys: 4000,
});

const LESSONS_CACHE_KEY_PREFIX = "lessons_course_";

const buildCourseLessonsCacheKey = (courseId) =>
  `${LESSONS_CACHE_KEY_PREFIX}course_${courseId}`;

const buildSectionLessonsCacheKey = (sectionId) =>
  `${LESSONS_CACHE_KEY_PREFIX}section_${sectionId}`;

const getLessonCache = (key) => lessonsCache.get(key);

const setLessonCache = (key, value) => lessonsCache.set(key, value);

const clearLessonCacheForCourse = (courseId) =>
  lessonsCache.del(buildCourseLessonsCacheKey(courseId));

const clearLessonCacheForSection = (sectionId) =>
  lessonsCache.del(buildSectionLessonsCacheKey(sectionId));

const clearAllLessonCache = () => lessonsCache.flushAll();

module.exports = {
  buildCourseLessonsCacheKey,
  buildSectionLessonsCacheKey,
  getLessonCache,
  setLessonCache,
  clearLessonCacheForCourse,
  clearLessonCacheForSection,
  clearAllLessonCache,
};
