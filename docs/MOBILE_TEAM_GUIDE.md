# Tai Lieu Huong Dan Phat Trien Mobile — FoodieDash

Tai lieu nay danh cho **toan bo team phat trien Flutter** cua du an FoodieDash. Muc tieu: moi nguoi code dong bo, khong conflict, de review, de merge.

---

## Muc luc

1. [Tong quan kien truc](#1-tong-quan-kien-truc)
2. [Cau truc thu muc & Vai tro tung thu muc](#2-cau-truc-thu-muc--vai-tro-tung-thu-muc)
3. [Quy uoc dat ten & Code style](#3-quy-uoc-dat-ten--code-style)
4. [Data Flow chuan — Cach code 1 feature moi](#4-data-flow-chuan--cach-code-1-feature-moi)
5. [Cac file toan cuc — Ai cung phai biet](#5-cac-file-toan-cuc--ai-cung-phai-biet)
6. [Quy tac tranh Conflict khi nhieu nguoi cung code](#6-quy-tac-tranh-conflict-khi-nhieu-nguoi-cung-code)
7. [Quy trinh Git & Branch](#7-quy-trinh-git--branch)
8. [Checklist truoc khi tao PR](#8-checklist-truoc-khi-tao-pr)
9. [Mau code tham khao nhanh](#9-mau-code-tham-khao-nhanh)
10. [Cac loi thuong gap & Cach tranh](#10-cac-loi-thuong-gap--cach-tranh)

---

## 1. Tong quan kien truc

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│  Pages (UI)  ←  BLoC (State Management)  ←  Widgets     │
├─────────────────────────────────────────────────────────┤
│                     DOMAIN LAYER                         │
│  UseCase (business logic)  ←  Entity (pure data)         │
│  Repository Interface (contract/abstract)                │
├─────────────────────────────────────────────────────────┤
│                      DATA LAYER                          │
│  RepositoryImpl  →  RemoteDataSource  →  Dio/API         │
│  Model (JSON serialization)  →  toEntity()               │
└─────────────────────────────────────────────────────────┘
```

**Nguyen tac cot loi: Dependency di tu ngoai vao trong**

- `Presentation` biet `Domain` + `Data`
- `Domain` **khong biet** bat ky layer nao khac (chi chua interface thuan Dart)
- `Data` implement `Domain` interface

**Package chinh:**

| Vai tro | Package | Ghi chu |
|---------|---------|---------|
| State | `flutter_bloc` | BLoC pattern — Event → BLoC → State |
| Router | `go_router` | Auth guard, role redirect, ShellRoute bottom nav |
| HTTP | `dio` | Token/Refresh/Error interceptors |
| DI | `get_it` | Service locator — `sl<T>()` de lay instance |
| Error | `dartz` | `Either<Failure, T>` — Left = loi, Right = thanh cong |
| Storage | `flutter_secure_storage` | Luu token (ma hoa) |
| Storage | `shared_preferences` | Luu onboarding, allergies, store selection |
| Auth | `equatable` | So sanh state/event khong trung lap |

---

## 2. Cau truc thu muc & Vai tro tung thu muc

```
mobile/lib/
│
├── main.dart                          # Entry point — KHONG ai duoc sua neu khong phai lead
│
├── app/                               # ⚠️ FOLDER CRITICAL — Chi lead/architect sua
│   ├── app.dart                       # Root widget, BLoC providers, theme, router
│   ├── app_blocs/auth/                # AuthBloc (global) — Events, States, BLoC
│   └── routes/app_router.dart         # TOAN BO route cua app — ShellRoute, auth guard
│
├── core/                              # Ha tang dung chung — Sua phai bao team
│   ├── constants/
│   │   ├── api_endpoints.dart         # Moi API endpoint — them endpoint moi o day
│   │   ├── app_colors.dart            # Bang mau toan app — KHONG hardcode mau trong widget
│   │   ├── app_constants.dart         # Base URL, timeout, app name
│   │   └── order_status.dart          # Enum/constants trang thai don hang
│   ├── di/injection.dart              # GetIt service locator — dang ky dependency o day
│   ├── error/
│   │   ├── exceptions.dart            # ServerException, NetworkException, AuthException...
│   │   └── failures.dart              # Failure, ServerFailure, ValidationFailure...
│   ├── network/
│   │   ├── api_client.dart            # Dio singleton — KHONG tao Dio moi, dung ApiClient().dio
│   │   └── api_interceptors.dart      # TokenInterceptor, RefreshInterceptor, ErrorInterceptor
│   ├── services/socket_service.dart   # Socket.IO singleton
│   ├── storage/
│   │   ├── secure_storage.dart        # TokenStorage — access/refresh token
│   │   └── local_storage.dart         # LocalStorage — onboarding, allergies, store
│   ├── theme/app_theme.dart           # ThemeData — dung AppColors, Material 3
│   └── utils/
│       ├── validators.dart            # Form validators (email, password, phone, OTP...)
│       ├── formatters.dart            # Currency, date formatters
│       ├── debouncer.dart             # Search debounce utility
│       ├── permission_utils.dart      # Permission handler helper
│       └── google_sign_in_helper.dart # Google Sign-In helper
│
├── features/                          # ⭐ MOI NGUOI LAM 1 FEATURE RIENG
│   └── <ten-feature>/
│       ├── data/                      # ⚠️ Chi sua khi duoc phan cong feature nay
│       │   ├── datasources/           # Goi API (Dio)
│       │   ├── models/                # JSON ↔ Model (UserModel, ProductModel...)
│       │   └── repositories/          # RepositoryImpl — implement Domain interface
│       ├── domain/                    # Logic nghiep vu thuan Dart
│       │   ├── entities/              # Entity (khong phu thuoc framework)
│       │   ├── repositories/          # Abstract interface
│       │   └── usecases/              # Moi use case 1 class, 1 nhiem vu
│       └── presentation/             # UI
│           └── pages/                 # Man hinh chinh
│
└── shared/widgets/                    # Widget dung chung — Neu viet widget moi, bao team
    ├── coming_soon_page.dart
    ├── empty_state_widget.dart
    ├── error_widget.dart              # AppErrorWidget — hien thi loi + nut retry
    ├── loading_indicator.dart
    ├── order_status_badge.dart
    └── price_text.dart
```

### Ai duoc sua thu muc nao?

| Thu muc | Ai sua? | Khi nao? |
|---------|---------|----------|
| `app/` | **Lead** | Router moi, BLoC toan cuc moi |
| `core/` | **Lead hoac bao team** | API endpoint moi, mau moi, utility moi |
| `features/<X>/` | **Nguoi duoc assign feature X** | Code feature X |
| `shared/widgets/` | **Bao team truoc** | Widget moi dung chung |

---

## 3. Quy uoc dat ten & Code style

### File & Folder

```
✅ login_page.dart          (snake_case)
✅ auth_bloc.dart           (bloc suffix cho ro)
✅ auth_remote_datasource.dart
✅ user_entity.dart         (entity suffix)
✅ user_model.dart          (model suffix)
✅ auth_repository.dart     (abstract interface)
✅ auth_repository_impl.dart (impl suffix)

❌ LoginPage.dart           (khong dung PascalCase)
❌ login.dart               (qua chung chung)
```

### Class, Variable, Function

```dart
// Class: PascalCase
class LoginPage extends StatefulWidget { }
class AuthBloc extends Bloc<AuthEvent, AuthState> { }
class AuthLoginRequested extends AuthEvent { }

// Variable/Function: camelCase
final emailController = TextEditingController();
void onLogin() { }
bool isLoading = false;

// Constant: camelCase
static const String apiBaseUrl = '...';
static const Color primary = Color(0xFFFF6B35);
```

### Import

```dart
// 1. dart: imports (thu vien Dart)
import 'dart:async';
import 'dart:ui';

// 2. package: imports (external packages)
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

// 3. project imports (foa_mobile)
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/utils/validators.dart';
```

> **QUAN TRONG:** Luon dung **package import** (`package:foa_mobile/...`), khong dung relative import (`../../core/...`). Dieu nay giup code dong nhat va tranh loi khi di chuyen file.

### State class — sealed pattern

```dart
// ✅ DUNG: Moi state la 1 class rieng, ke thua Equatable
abstract class AuthState extends Equatable {
  const AuthState();
}

class AuthInitial extends AuthState { const AuthInitial(); }
class AuthLoading extends AuthState { const AuthLoading(); }
class AuthAuthenticated extends AuthState {
  final Map<String, dynamic> user;
  final String role;
  const AuthAuthenticated({required this.user, required this.role});
  @override
  List<Object?> get props => [user, role];
}
class AuthError extends AuthState {
  final String message;
  const AuthError(this.message);
  @override
  List<Object?> get props => [message];
}
```

---

## 4. Data Flow chuan — Cach code 1 feature moi

### Vi du: Them feature "Danh sach voucher"

```
Buoc 1: Them API endpoint vao core/constants/api_endpoints.dart
        static const String vouchers = '/vouchers';

Buoc 2: Tao Domain layer (thuan Dart, khong phu thuoc gi)
        features/vouchers/domain/entities/voucher_entity.dart
        features/vouchers/domain/repositories/voucher_repository.dart  (abstract)
        features/vouchers/domain/usecases/get_vouchers_usecase.dart

Buoc 3: Tao Data layer (implement Domain)
        features/vouchers/data/models/voucher_model.dart  (fromJson, toJson, toEntity)
        features/vouchers/data/datasources/voucher_remote_datasource.dart
        features/vouchers/data/repositories/voucher_repository_impl.dart

Buoc 4: Dang ky DI trong core/di/injection.dart
        sl.registerLazySingleton<VoucherRepository>(
          () => VoucherRepositoryImpl(sl<VoucherRemoteDataSource>()),
        );
        sl.registerLazySingleton<GetVouchersUseCase>(
          () => GetVouchersUseCase(sl<VoucherRepository>()),
        );

Buoc 5: Tao BLoC + UI
        features/vouchers/presentation/bloc/voucher_bloc.dart
        features/vouchers/presentation/pages/voucher_list_page.dart

Buoc 6: Them route vao app/routes/app_router.dart (BAO LEAD)
        GoRoute(path: '/vouchers', builder: (_, __) => const VoucherListPage()),
```

### Luong du lieu chi tiet

```
Nguoi dung tap "Vouchers"
  → GoRouter → VoucherListPage
    → VoucherListPage tao VoucherBloc, goi bloc.add(GetVouchers())
      → VoucherBloc._onGetVouchers():
          emit(VoucherLoading())
          final result = await getVouchersUseCase()
            → GetVouchersUseCase goi voucherRepository.getVouchers()
              → VoucherRepositoryImpl goi voucherRemoteDataSource.getAll()
                → VoucherRemoteDataSource goi _dio.get('/vouchers')
                ← response.data (JSON)
              ← List<VoucherModel>
            ← List<VoucherEntity>
          result.fold(
            (failure) → emit(VoucherError(failure.message)),
            (vouchers) → emit(VoucherLoaded(vouchers)),
          )
    → BlocBuilder bat VoucherLoaded → hien thi list
```

---

## 5. Cac file toan cuc — Ai cung phai biet

### 5.1 `core/constants/api_endpoints.dart`

**Moi API endpoint moi phai duoc them vao day.** Khong hardcode URL string trong datasource.

```dart
// ✅ DUNG
final response = await _dio.get(ApiEndpoints.products);

// ❌ SAI
final response = await _dio.get('/products');
```

### 5.2 `core/constants/app_colors.dart`

**Chi dung mau tu AppColors.** Khong hardcode mau trong widget.

```dart
// ✅ DUNG
color: AppColors.primary,
color: AppColors.textSecondary,

// ❌ SAI
color: Color(0xFFFF6B35),
color: Colors.orange,
```

### 5.3 `core/di/injection.dart`

Moi khi tao Repository/UseCase/BLoC moi, **phai dang ky vao day**.

```dart
// Dang ky theo thu tu: DataSource → Repository → UseCase → BLoC
sl.registerLazySingleton<VoucherRemoteDataSource>(() => VoucherRemoteDataSource());
sl.registerLazySingleton<VoucherRepository>(() => VoucherRepositoryImpl(sl()));
sl.registerLazySingleton<GetVouchersUseCase>(() => GetVouchersUseCase(sl()));
```

### 5.4 `app/routes/app_router.dart`

**Chi Lead/Architect sua file nay.** Neu can them route moi, bao lead.

Cac loai route:
- **Public routes:** `/splash`, `/login`, `/register`, `/onboarding`, `/verify-email`, `/forgot-password`, `/reset-password`
- **Customer Shell routes:** `/home`, `/menu`, `/cart`, `/orders`, `/profile` (co bottom nav)
- **Staff Shell routes:** `/staff/orders`, `/staff/delivery`, `/staff/menu`, `/staff/chat`, `/staff/settings`
- **Detail routes:** `/food/:id`, `/orders/:id`, `/profile/edit`... (khong co bottom nav)

### 5.5 `core/network/api_client.dart`

**Luon lay Dio tu ApiClient, khong tu tao Dio moi:**

```dart
// ✅ DUNG
final dio = sl<Dio>();
// hoac
final dio = ApiClient().dio;

// ❌ SAI
final dio = Dio(BaseOptions(baseUrl: '...'));
```

### 5.6 `core/utils/validators.dart`

Tat ca validator dung chung. Neu viet validator moi, them vao day de ca team dung.

---

## 6. Quy tac tranh Conflict khi nhieu nguoi cung code

### Nguyen tac 1: Moi nguoi 1 feature — KHONG cham feature cua nguoi khac

```
Nguoi A → features/cart/       ← chi sua trong nay
Nguoi B → features/orders/     ← chi sua trong nay
Nguoi C → features/profile/    ← chi sua trong nay
```

### Nguyen tac 2: File toan cuc — BAO TEAM truoc khi sua

Cac file de gay conflict nhat:

| File | Muc do rui ro | Cach xu ly |
|------|--------------|------------|
| `app_router.dart` | 🔴 Rat cao | Chi Lead sua |
| `api_endpoints.dart` | 🟡 Cao | Them endpoint → bao team, merge som |
| `injection.dart` | 🟡 Cao | Dang ky o cuoi file, merge som |
| `app_colors.dart` | 🟢 Thap | Them mau moi → bao team |
| `pubspec.yaml` | 🟡 Cao | Them package → bao team truoc |

### Nguyen tac 3: Merge code chung (develop) thuong xuyen

```
Moi sang: git pull origin develop  ← lay code moi nhat
Moi toi truoc khi push: git pull origin develop  ← tranh conflict khi tao PR
```

### Nguyen tac 4: UI widget — Dung shared widgets

Truoc khi tu viet 1 widget, kiem tra `shared/widgets/` xem da co chua:

| Widget co san | Dung khi |
|---------------|----------|
| `AppErrorWidget` | Hien thi loi + nut retry |
| `EmptyStateWidget` | Khong co du lieu |
| `LoadingIndicator` | Dang load |
| `PriceText` | Hien thi gia tien |
| `OrderStatusBadge` | Badge trang thai don hang |
| `ComingSoonPage` | Man hinh chua implement |

---

## 7. Quy trinh Git & Branch

### Cau hinh Git (chay 1 lan)

```bash
git config --global pull.ff only
git config --global push.default current
```

### Quy trinh lam viec

```
develop (nhanh chinh)
  │
  ├── feat/<ten-feature>         ← tinh nang moi (vd: feat/voucher-list)
  ├── fix/<ma-issue>-<mo-ta>      ← sua loi (vd: fix/140-confirm-order)
  └── chore/<mo-ta>              ← refactor, docs, config
```

### Cac buoc lam viec hang ngay

```bash
# 1. Sang — lay code moi nhat
git checkout develop
git pull origin develop

# 2. Tao branch moi tu develop
git checkout -b feat/ten-feature-cua-ban

# 3. Code... code... code...
#    (chi sua trong thu muc feature cua ban + file toan cuc neu can)

# 4. Commit thuong xuyen (nho, gon)
git add features/ten-feature/
git commit -m "feat(ten-feature): mo ta ngan gon"

# 5. Truoc khi push — rebase voi develop
git fetch origin develop
git rebase origin/develop
# → Neu co conflict, resolve tung file, git add, git rebase --continue

# 6. Push va tao PR
git push origin feat/ten-feature-cua-ban
# → Len GitHub tao PR vao develop
```

### Quy tac commit message

```
<type>(<scope>): <mo ta ngan gon>

Type: feat | fix | chore | docs | refactor | test
Scope: ten feature dang lam
```

Vi du:
```
feat(vouchers): add voucher list page with filter
fix(cart): resolve quantity update race condition
chore(deps): upgrade dio to 5.9.2
```

### Giai quyet Conflict

```
Neu rebase bi conflict:
1. Mo file bi conflict (tim <<<<<<<, =======, >>>>>>>)
2. Giu code dung, xoa code sai + markers
3. git add <file-da-sua>
4. git rebase --continue
5. Lap lai cho den khi rebase xong
```

---

## 8. Checklist truoc khi tao PR

Truoc khi push code len va tao Pull Request, **bat buoc** kiem tra:

```
□ flutter analyze        → 0 issues (KHONG CO LOI NAO)
□ flutter pub get        → thanh cong
□ App chay duoc tren may → khong crash
□ Da test manual cac luong chinh cua feature
□ Da xoa het print() debug, TODO ca nhan
□ Da kiem tra khong import thua
□ File toan cuc neu co sua → da bao team
□ Commit message dung format
□ Da rebase voi develop moi nhat
```

### Khong duoc merge neu:

- `flutter analyze` co loi (du chi 1 warning info)
- App crash khi chay
- Co hardcoded secret/token/password trong code
- Co `// ignore:` comment khong giai thich ly do
- Xoa/sua code cua nguoi khac ngoai y muon

---

## 9. Mau code tham khao nhanh

### Mau 1: Repository Interface (Domain)

```dart
// features/<feature>/domain/repositories/<feature>_repository.dart
import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/features/<feature>/domain/entities/<feature>_entity.dart';

abstract class FeatureRepository {
  Future<Either<Failure, List<FeatureEntity>>> getAll();
  Future<Either<Failure, FeatureEntity>> getById(String id);
}
```

### Mau 2: Model + Entity

```dart
// Entity (Domain — thuan Dart)
class ProductEntity {
  final String id;
  final String name;
  final double price;
  const ProductEntity({required this.id, required this.name, required this.price});
}

// Model (Data — co JSON serialization)
class ProductModel {
  final String id;
  final String name;
  final double price;
  const ProductModel({required this.id, required this.name, required this.price});

  factory ProductModel.fromJson(Map<String, dynamic> json) => ProductModel(
    id: json['_id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    price: (json['price'] as num?)?.toDouble() ?? 0.0,
  );

  Map<String, dynamic> toJson() => {'_id': id, 'name': name, 'price': price};

  ProductEntity toEntity() => ProductEntity(id: id, name: name, price: price);
}
```

### Mau 3: DataSource

```dart
// features/<feature>/data/datasources/<feature>_remote_datasource.dart
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';

class FeatureRemoteDataSource {
  final Dio _dio;
  FeatureRemoteDataSource(this._dio);

  Future<List<Map<String, dynamic>>> getAll() async {
    final response = await _dio.get(ApiEndpoints.products);
    final data = response.data as Map<String, dynamic>;
    return (data['data'] as List).cast<Map<String, dynamic>>();
  }
}
```

### Mau 4: RepositoryImpl

```dart
class FeatureRepositoryImpl implements FeatureRepository {
  final FeatureRemoteDataSource _dataSource;
  FeatureRepositoryImpl(this._dataSource);

  @override
  Future<Either<Failure, List<FeatureEntity>>> getAll() async {
    try {
      final jsonList = await _dataSource.getAll();
      final entities = jsonList.map((j) => FeatureModel.fromJson(j).toEntity()).toList();
      return Right(entities);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  Failure _mapErrorToFailure(dynamic error) {
    // Copy tu auth_repository_impl.dart — cung 1 pattern
    if (error is DioException) {
      final inner = error.error;
      if (inner is NetworkException) return const NetworkFailure();
      if (inner is ServerException) return ServerFailure(message: inner.message, statusCode: inner.statusCode);
    }
    return ServerFailure(message: error.toString());
  }
}
```

### Mau 5: BLoC + UI pattern

```dart
// Trong page:
BlocBuilder<FeatureBloc, FeatureState>(
  builder: (context, state) => switch (state) {
    FeatureInitial() || FeatureLoading() => const LoadingIndicator(),
    FeatureLoaded(:final items) => ListView.builder(
      itemCount: items.length,
      itemBuilder: (_, i) => ItemCard(items[i]),
    ),
    FeatureError(:final message) => AppErrorWidget(
      message: message,
      onRetry: () => context.read<FeatureBloc>().add(LoadFeature()),
    ),
  },
)
```

---

## 10. Cac loi thuong gap & Cach tranh

| # | Loi | Hau qua | Cach tranh |
|---|-----|---------|------------|
| 1 | **Dung Dio truc tiep trong BLoC** | Pha vo Clean Architecture | BLoC chi goi UseCase/Repository, khong goi Dio |
| 2 | **Tao Dio moi** (`Dio(BaseOptions(...))`) | Mat interceptor, mat token | Luon dung `sl<Dio>()` hoac `ApiClient().dio` |
| 3 | **Dung `Navigator.push` thay vi `context.push`** | Pha vo GoRouter state | Luon dung `context.push()`, `context.go()` cua GoRouter |
| 4 | **Quen `mounted` check sau async** | Crash khi widget da dispose | Sau moi `await`, kiem tra `if (!mounted) return;` |
| 5 | **Hardcode mau `Colors.orange`** | Khong dong bo theme | Chi dung `AppColors.xxx` |
| 6 | **Hardcode URL API** | Kho doi moi truong | Dung `ApiEndpoints.xxx` |
| 7 | **Sua file `app_router.dart` khong bao team** | Conflict route, crash app | Bao Lead truoc khi sua |
| 8 | **Commit qua to (10+ files khong lien quan)** | Kho review, de conflict | Moi commit 1 muc dich, 3-7 files |
| 9 | **Khong rebase truoc khi push** | Conflict khi merge PR | Luon `git fetch origin develop && git rebase origin/develop` |
| 10 | **Bo qua `flutter analyze`** | Bug an, code ban | Chay truoc moi commit |

---

## Phu luc: Danh sach tinh nang & Nguoi phu trach

| # | Feature | Thu muc | Trang thai | Nguoi lam |
|---|---------|---------|------------|-----------|
| 1 | Auth (login, register, forgot PW) | `features/auth/` | ✅ Co data/domain/presentation | ... |
| 2 | Home | `features/home/` | ⚠️ Mock data | ... |
| 3 | Menu | `features/menu/` | 🔲 Skeleton | ... |
| 4 | Food Detail | `features/food_detail/` | 🔲 Skeleton | ... |
| 5 | Cart | `features/cart/` | 🔲 Skeleton | ... |
| 6 | Checkout | `features/checkout/` | 🔲 Skeleton | ... |
| 7 | Orders | `features/orders/` | 🔲 Skeleton | ... |
| 8 | Profile | `features/profile/` | 🔲 Skeleton | ... |
| 9 | Vouchers | `features/vouchers/` | 🔲 Skeleton | ... |
| 10 | Membership | `features/membership/` | 🔲 Skeleton | ... |
| 11 | Notifications | `features/notifications/` | 🔲 Skeleton | ... |
| 12 | Support Chat | `features/support_chat/` | 🔲 Skeleton | ... |
| 13 | Reviews | `features/reviews/` | 🔲 Skeleton | ... |
| 14 | AI Suggestions | `features/ai_suggestions/` | 🔲 Skeleton | ... |
| 15 | Staff Orders | `features/staff_orders/` | 🔲 Skeleton | ... |
| 16 | Staff Delivery | `features/staff_delivery/` | 🔲 Skeleton | ... |
| 17 | Staff Menu | `features/staff_menu/` | 🔲 Skeleton | ... |
| 18 | Staff Chat | `features/staff_chat/` | 🔲 Skeleton | ... |

> Lead dien ten vao cot "Nguoi lam" khi phan cong.

---

*Tai lieu cap nhat lan cuoi: 2026-06-28*
*Nguoi viet: Team Lead Mobile*
