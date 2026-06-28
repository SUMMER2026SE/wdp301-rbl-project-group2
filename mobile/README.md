# FoodieDash Mobile

Ung dung di dong Flutter cho he thong FoodieDash — dat mon an thong minh voi goi y AI.

## Yeu cau he thong

| Cong cu | Phien ban toi thieu |
|---------|-------------------|
| Flutter | 3.38.x |
| Dart   | 3.11.x |
| Android Studio / VS Code | Ban moi nhat |

## Cai dat & Chay

```bash
# 1. Cai dependencies
cd mobile
flutter pub get

# 2. Chay voi backend local (mac dinh localhost:8005)
flutter run

# 3. Chay voi backend tuy chinh
flutter run --dart-define=API_BASE_URL=http://192.168.1.100:8005/api \
            --dart-define=SOCKET_BASE_URL=http://192.168.1.100:8005

# 4. Build APK release
flutter build apk --release
```

## Cau truc thu muc

```
mobile/
├── lib/
│   ├── app/                    # App root: BLoCs, router, theme
│   │   ├── app_blocs/          # Global BLoCs (auth)
│   │   └── routes/             # GoRouter config
│   ├── core/                   # Shared infrastructure
│   │   ├── constants/          # API endpoints, colors, app config
│   │   ├── di/                 # Dependency injection (GetIt)
│   │   ├── error/              # Exceptions & Failures (Either pattern)
│   │   ├── network/            # Dio client + interceptors
│   │   ├── services/           # Socket.IO service
│   │   ├── storage/            # Secure storage (tokens) + SharedPreferences
│   │   ├── theme/              # Material 3 theme
│   │   └── utils/              # Validators, formatters, debouncer
│   ├── features/               # Feature modules (Clean Architecture)
│   │   └── <feature>/
│   │       ├── data/           # Data sources, models, repository impls
│   │       │   ├── datasources/
│   │       │   ├── models/
│   │       │   └── repositories/
│   │       ├── domain/         # Entities, repository interfaces, use cases
│   │       │   ├── entities/
│   │       │   ├── repositories/
│   │       │   └── usecases/
│   │       └── presentation/   # Pages, widgets, BLoCs (if feature-scoped)
│   │           └── pages/
│   └── shared/                 # Reusable widgets
│       └── widgets/
├── assets/
│   └── images/                 # Logo, illustrations
├── test/                       # Unit & widget tests
├── pubspec.yaml
└── analysis_options.yaml
```

## Kien truc

Du an theo **Clean Architecture** voi 3 layer:

```
Presentation (UI)  →  Domain (Business Logic)  →  Data (API/Storage)
       ↕                      ↕                          ↕
   BLoC + Widget        UseCase + Entity          Repository + Model
```

### Pattern chinh

| Pattern | Cong nghe |
|---------|-----------|
| State Management | **flutter_bloc** (BLoC) |
| Navigation | **go_router** |
| HTTP Client | **Dio** voi interceptors |
| DI | **get_it** (service locator) |
| Error Handling | **dartz** `Either<Failure, T>` |
| Auth | Bearer token + refresh token rotation |
| Realtime | **socket_io_client** |

### Data Flow chuan

```
Page/Widget
  → BLoC.add(Event)
    → BLoC goi UseCase (domain)
      → UseCase goi Repository (domain interface)
        → RepositoryImpl goi DataSource (data)
          → DataSource goi Dio (network)
        ← Either<Failure, Data>
      ← Either<Failure, Entity>
    ← emit(State)
  ← BlocBuilder rebuilds UI
```

## Quy uoc code

### Dat ten

- **File:** `snake_case.dart` — `login_page.dart`, `auth_bloc.dart`
- **Class:** `PascalCase` — `LoginPage`, `AuthBloc`, `AuthLoginRequested`
- **Variables/Functions:** `camelCase` — `onLogin`, `emailController`
- **Constants:** `camelCase` cho static const

### Import

- Luon dung **package imports** (`package:foa_mobile/...`)
- Sap xep: dart: → package: → relative

### State Management

- Moi event ke thua `AuthEvent extends Equatable`
- Moi state ke thua `AuthState extends Equatable`
- Dung `sealed class` cho state hierarchy khi co the

### Xu ly loi

- Repository tra ve `Either<Failure, T>`
- `ErrorInterceptor` (Dio) chuyen HTTP errors → typed `ServerException`
- Repository `_mapErrorToFailure()` chuyen Exception → Failure
- BLoC fold() de emit state tuong ung

## Workflow phat trien

1. **Tao branch:** `git checkout -b feat/<ten-feature>`
2. **Viet code:**
   - Neu co API moi → them endpoint vao `core/constants/api_endpoints.dart`
   - Tao `domain/entities/` → `domain/repositories/` interface
   - Implement `data/models/` → `data/datasources/` → `data/repositories/`
   - Tao BLoC + Widget trong `presentation/`
3. **Chay analyzer:** `flutter analyze` (phai 0 issues)
4. **Viet test:** it nhat cho BLoC va Validators
5. **PR** → code review → merge

## Lint Rules

Du an dung `flutter_lints` + cac rule bo sung:
- `avoid_print` — dung `debugPrint` hoac logger
- `unawaited_futures` — luon `await` hoac `unawaited()` cho Future
- `use_build_context_synchronously` — kiem tra `mounted` sau async gap

## Debug

```bash
# Xem log Dio network
flutter run  # Dio LogInterceptor tu dong log request/response

# Kiem tra routing
# GoRouter debugLogDiagnostics: true (mac dinh)

# Hot reload
r  # trong terminal flutter run
```

## Lien he

- **Backend repo:** `../backend`
- **Frontend web repo:** `../frontend`
- **API docs:** Chay backend → `http://localhost:8005/api/health`
