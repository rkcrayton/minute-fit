# Testing Documentation - Minute Fit

## Overview

Minute Fit has two independent test suites:

| Suite | Location | Runner | Total Tests |
|---|---|---|---|
| Backend API | `apps/api/tests/` | pytest | 194 |
| Frontend Mobile | `apps/mobile/__tests__/` | Jest / React Native Testing Library | ~180 |

Backend coverage is enforced at **85% minimum** via `pytest-cov`. The frontend suite covers rendering, hooks, context state, and service layer mocking.

---

## Running the Tests

### Backend

```bash
cd apps/api

# Run all tests with coverage report
python -m pytest tests/

# Run a specific file
python -m pytest tests/integration/test_users.py

# Run a specific test
python -m pytest tests/integration/test_users.py::test_login_success

# Run only unit tests
python -m pytest tests/unit/

# Run only integration tests
python -m pytest tests/integration/
```

### Frontend

```bash
cd apps/mobile

# Run all tests
npx jest

# Run with coverage
npx jest --coverage

# Run a specific file
npx jest __tests__/contexts/auth.test.tsx

# Watch mode (re-runs on file change)
npx jest --watch
```

---

## Backend Test Infrastructure

### Database

Tests use an **in-memory SQLite database** (`sqlite://`) instead of PostgreSQL. The engine is constructed before any app module imports using a `patch` on `sqlalchemy.create_engine`, ensuring the app never connects to a real database during tests.

Each test gets a **transaction that is rolled back** on teardown, so tests are fully isolated with no cleanup overhead.

```python
# conftest.py - how isolation works
@pytest.fixture
def db(create_tables):
    conn = TEST_ENGINE.connect()
    trans = conn.begin()
    session = TestSessionLocal(bind=conn)
    yield session
    session.close()
    trans.rollback()   # all changes undone after every test
    conn.close()
```

### Rate Limiter Reset

Because the rate limiter is an in-process singleton, its counters are reset after every test to prevent limits from accumulating across the suite:

```python
@pytest.fixture(autouse=True)
def reset_rate_limiter():
    from limiter import limiter
    yield
    limiter._storage.reset()
```

### Key Fixtures

| Fixture | Description |
|---|---|
| `client` | FastAPI `TestClient` with DB override wired in |
| `db` | Isolated SQLAlchemy session, rolled back after each test |
| `test_user` | Minimal user - no height/weight/age set |
| `complete_user` | Full profile user - required for scan/workout plan tests |
| `auth_headers` | Bearer token header for `test_user` |
| `complete_auth_headers` | Bearer token header for `complete_user` |
| `seeded_db` | DB pre-populated with 8 default exercises |

---

## Components and Services Under Test

### Backend

| Component | Test File(s) | Type |
|---|---|---|
| Authentication (JWT, hashing) | `unit/test_auth.py`, `integration/test_auth.py` | Unit + Integration |
| User registration / login / profile | `integration/test_users.py` | Integration |
| Token refresh + revocation | `integration/test_users.py` | Integration |
| Exercise catalog + seeding | `integration/test_exercises.py` | Integration |
| Body scan upload + analysis | `integration/test_scan.py`, `unit/test_scan.py` | Unit + Integration |
| Water logging | `integration/test_water.py` | Integration |
| Workout plans (CRUD + generation) | `test_workout_plans.py` | Integration |
| End-to-end user workflows | `integration/test_workflows.py` | End-to-End |
| LLM service (Gemini) | `unit/test_llm.py` | Unit |
| Body fat calculation (Navy formula) | `unit/test_volume_calculation.py` | Unit |
| Image sanitization | `unit/test_scan.py`, `unit/test_users_helpers.py` | Unit |
| Wger exercise sync helpers | `unit/test_wger_sync.py` | Unit |
| App startup / health check | `integration/test_main.py` | Integration |
| Database session factory | `unit/test_database.py` | Unit |
| Config / env parsing | `unit/test_config.py` | Unit |

### Frontend

| Component | Test File |
|---|---|
| Auth context (login, logout, register, profile update) | `contexts/auth.test.tsx` |
| Onboarding context | `contexts/onboarding.test.tsx` |
| Tracking preferences context | `contexts/tracking-preferences.test.tsx` |
| API base URL detection (platform branching) | `services/api.test.ts` |
| Axios interceptors (token injection, auto-refresh) | `services/api.interceptors.test.ts` |
| Water service | `services/water.test.ts` |
| Workout service | `services/workouts.test.ts` |
| Scan service | `services/scan.test.ts` |
| Tracking goals service | `services/tracking-goals.test.ts` |
| HealthKit data hook | `hooks/use-health-data.test.ts` |
| Scan capture hook | `hooks/use-scan-capture.test.ts` |
| Theme color hook | `hooks/use-theme-color.test.ts` |
| GoalCards component | `components/goal-cards.test.tsx` |
| TodayProgress component | `components/today-progress.test.tsx` |
| GreetingHeader component | `components/greeting-header.test.tsx` |
| NextWorkoutCard component | `components/next-workout-card.test.tsx` |
| RecentWorkouts component | `components/recent-workouts.test.tsx` |
| StatCard component | `components/stat-card.test.tsx` |
| SettingsOption component | `components/settings-option.test.tsx` |
| TrackingConfigModal component | `components/tracking-config-modal.test.tsx` |
| TrackingSection component | `components/tracking-section.test.tsx` |
| WaterLogModal component | `components/water-log-modal.test.tsx` |

---

## Significant Test Case Descriptions

### Authentication & Token Security

**`test_refresh_token_rotated`**
Verifies that every call to `POST /users/token/refresh` issues a brand-new refresh token and the old one is different. Prevents token reuse.

**`test_refresh_token_rejects_access_token`**
Submits an access token to the refresh endpoint. Must return 401. Prevents token type confusion attacks where an access token is used to extend a session indefinitely.

**`test_refresh_token_user_not_found`**
Submits a cryptographically valid refresh token whose JTI was never stored in the database (crafted directly without going through login). Must return 401. Verifies that the server-side JTI store is authoritative - a valid JWT signature alone is not enough.

**`test_get_current_user_rejects_refresh_token`**
Passes a refresh token to a protected endpoint that expects an access token. Must return 401. Ensures the `type` claim is enforced.

**`test_get_current_user_expired_token`**
Creates a token with a negative expiry delta (already expired). Must return 401.

---

### Body Scan

**`test_analyze_unauthenticated`**
Submits images to `POST /scan/analyze` without a bearer token. Must return 401. Ensures the scan endpoint is not publicly accessible.

**`test_analyze_bad_magic_bytes`**
Uploads a file with a `.jpg` extension but PDF magic bytes (`%PDF-1.4`). Must return 400. Verifies that extension-spoofing is caught before any image processing occurs.

**`test_analyze_file_too_large`**
Uploads a front image exceeding the 20 MB limit. Must return 413. Verifies the size guard fires before the file is written to disk.

**`test_get_results_cannot_access_other_users_scan`**
User A creates a scan. User B (with a valid token) requests it by session ID. Must return 404, not 200. Verifies per-user data isolation on the scan results endpoint.

**`test_analyze_value_error_from_processing`**
The image processing pipeline raises a `ValueError` with a detailed internal message. The response must return 422 with the generic message `"Photo processing failed"` - not the raw exception string. Verifies internal details are not leaked to clients.

---

### Workout Plans

**`test_today_summary_after_plan`**
Creates a plan with an exercise only on Monday, then mocks `datetime.now` to return a fixed Monday (2024-01-01). Asserts that `day == "monday"`, `is_rest_day == false`, and the exercise name matches. If the router returns the wrong day, `workouts_goal_today` will be 0 and the test fails - exposing any bug in the day-of-week calculation.

**`test_put_rejects_unknown_exercise_id`**
Submits a plan referencing `exercise_id: 999999` which does not exist. Must return 400. Verifies the validation layer prevents orphaned schedule entries.

**`test_patch_day_only_touches_that_day`**
Seeds a plan with exercise A on Monday and Tuesday. PATCHes Monday with exercise B. Asserts Monday now has B while Tuesday still has A - verifying partial-day updates do not bleed into other days.

**`test_generate_plan_filters_invalid_exercise_ids`**
Mocks the LLM to return a plan that includes a real exercise ID alongside `999999`. The API must strip the invalid ID and return only the valid entry. Verifies the post-LLM validation pass.

**`test_generate_503_without_gemini_key`**
Clears the `GEMINI_API_KEY` setting. The `POST /workout-plans/generate` endpoint must return 503, not crash. Verifies graceful degradation when the LLM service is unconfigured.

---

### User Registration & Profile

**`test_register_duplicate_email`**
Registers a user, then attempts to register again with the same email but a different username. Must return 400 with "Email already registered".

**`test_upload_avatar_success`**
Uploads a valid JPEG avatar. Asserts the response contains a non-null `profile_picture` field AND that the sanitized JPEG file physically exists on disk at the mocked avatar directory path. Verifies that the file I/O actually completes, not just that the endpoint returns 200.

---

### Water Tracking

**`test_old_log_not_counted_in_today`**
Logs 200 oz backdated to a past date, then logs 8 oz with the current timestamp. `GET /water/today` must return `total_oz == 8.0`. Verifies that the daily boundary query correctly excludes historical logs.

**`test_today_summary_goal_default_no_weight`**
A user with no weight set gets a daily goal of 64 oz (the default). Verifies the null-weight fallback path.

---

### End-to-End Workflows

**`test_user_data_isolation`**
Creates two users (Alice and Bob). Alice logs a workout and water. Bob's history and today's water are asserted to be empty. Covers the full data isolation guarantee across both the workout and water domains in a single test.

**`test_today_summary_progress_updates`**
Full workflow: create plan → fetch today's summary → log one exercise → fetch summary again → assert `workouts_done_today` incremented by exactly 1. Mocks datetime to a fixed Monday so the test is deterministic. Exercises the full chain from plan storage through exercise logging to the aggregation query.

**`test_token_refresh_flow`**
Login → capture refresh token → exchange for new access token → use new access token to call `GET /users/me` → assert 200 and correct username. Verifies the full token lifecycle works end-to-end.

---

### Frontend - Auth Context

**`test_stores_tokens_and_sets_user_on_login`**
Calls `login()` and asserts that `SecureStore.setItemAsync` is called with both `"token"` and `"refresh_token"`, and that the user state is populated from the `/users/me` response.

**`test_sends_credentials_as_URL_encoded_form`**
Verifies that the login request body is sent as `application/x-www-form-urlencoded` (required by the OAuth2 password flow), not JSON. Checks that `username=` and `password=` appear in the encoded body string.

**`test_clears_tokens_when_stored_token_invalid`**
Simulates app startup with an expired token in `SecureStore`. The `/users/me` call fails. Asserts both tokens are deleted and user state is null.

---

### Frontend - API Interceptors

**`test_retries_original_request_after_refresh`**
Simulates a 401 response on the first request, a successful token refresh on the second call, and then the original request succeeding on the third call. Asserts all three calls fire in the correct order. Verifies the interceptor's automatic retry logic works end-to-end.

**`test_does_not_retry_if_refresh_fails`**
When the refresh call itself returns 401, the interceptor must reject the promise rather than retrying infinitely. Prevents a silent infinite loop on session expiry.

---

### Frontend - HealthKit Hook

**`test_counts_ASLEEP_CORE_DEEP_REM_stages`**
Provides sleep samples with ASLEEP_CORE, ASLEEP_DEEP, and ASLEEP_REM stages. Asserts the total sleep hours is the sum of all three, excluding any AWAKE stages. Verifies the sleep quality calculation uses the correct HKCategoryValueSleepAnalysis constants.

---

### Body Fat Calculation (Unit)

**`test_male_zero_diff_no_crash`**
Passes values that produce a zero or near-zero logarithm argument in the US Navy formula. Asserts the function returns a clamped float rather than raising a `ZeroDivisionError` or `ValueError`. Verifies the numeric guard in the formula implementation.

**`test_male_clamped_to_minimum`**
Passes values that would compute a body fat below 3%. Asserts the return value is clamped to 3.0. Verifies the physiological minimum boundary.

---

## Test Scripts

### Backend - Full Suite

```bash
cd apps/api
python -m pytest tests/ -v --tb=short
```

### Backend - Coverage Report (HTML)

```bash
cd apps/api
python -m pytest tests/ --cov=app --cov-report=html
# Open htmlcov/index.html in a browser
```

### Backend - Only Fast Unit Tests

```bash
cd apps/api
python -m pytest tests/unit/ -v
```

### Backend - Only End-to-End Workflows

```bash
cd apps/api
python -m pytest tests/integration/test_workflows.py -v
```

### Frontend - Full Suite with Coverage

```bash
cd apps/mobile
npx jest --coverage --coverageDirectory=coverage
```

### Frontend - Single Component

```bash
cd apps/mobile
npx jest __tests__/components/today-progress.test.tsx --verbose
```

### Frontend - All Context Tests

```bash
cd apps/mobile
npx jest __tests__/contexts/ --verbose
```

### Run Both Suites (from repo root)

```bash
# Backend
cd apps/api && python -m pytest tests/ -q && cd ../..

# Frontend
cd apps/mobile && npx jest --passWithNoTests && cd ../..
```

Or using the Makefile if configured:

```bash
make test
```

---

## Coverage Thresholds

| Suite | Enforced Minimum | Current |
|---|---|---|
| Backend | 85% | ~87% |
| Frontend | Not enforced | ~65% (render-focused) |

The backend threshold is configured in `pytest.ini` / `setup.cfg`. A PR that drops below 85% will fail CI.
