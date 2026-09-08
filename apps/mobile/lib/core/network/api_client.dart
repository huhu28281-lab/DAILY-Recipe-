import 'package:dio/dio.dart';

/// Cloudflare Workers 백엔드(apps/api) 통신 클라이언트.
/// 민감정보(알레르기·식이 목표)는 생성 요청 시 익명 ID(m_01 등)로만 전송한다 (§8).
/// TODO: baseUrl 환경별 분기(dev/prod), 인터셉터, 에러 매핑 구현
class ApiClient {
  ApiClient({required this.baseUrl}) : dio = Dio(BaseOptions(baseUrl: baseUrl));

  final String baseUrl;
  final Dio dio;
}
