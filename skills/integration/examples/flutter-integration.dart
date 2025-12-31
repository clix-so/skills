// Flutter Clix SDK Integration Example
//
// This file is constructed directly from Clix SDK `search_sdk` sample sources:
// - samples/basic_app/lib/main.dart
// - samples/basic_app/lib/clix_configuration.dart
//
// Pattern:
// - WidgetsFlutterBinding.ensureInitialized()
// - Firebase.initializeApp()
// - Load `assets/clix_config.json` -> ClixConfig
// - await Clix.initialize(config)
// - await Clix.Notification.configure(autoRequestPermission: true)

import 'dart:convert';

import 'package:clix_flutter/clix_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class ClixConfiguration {
  static const ClixLogLevel logLevel = ClixLogLevel.debug;

  static ClixConfig? _config;

  static ClixConfig get config {
    if (_config == null) {
      throw StateError(
        'ClixConfiguration not initialized. Call initialize() first.',
      );
    }
    return _config!;
  }

  static Future<void> initialize({
    String path = 'assets/clix_config.json',
  }) async {
    if (_config != null) return; // Already initialized

    final jsonString = await rootBundle.loadString(path);
    final jsonMap = json.decode(jsonString) as Map<String, dynamic>;

    _config = ClixConfig(
      projectId: jsonMap['projectId'] as String,
      apiKey: jsonMap['apiKey'] as String,
      endpoint: jsonMap['endpoint'] as String,
      logLevel: logLevel,
      extraHeaders: Map<String, String>.from(
        jsonMap['extraHeaders'] as Map? ?? {},
      ),
    );
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp();

  await ClixConfiguration.initialize();
  final config = ClixConfiguration.config;

  await Clix.initialize(config);
  await Clix.Notification.configure(autoRequestPermission: true);

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Scaffold(
        body: Center(child: Text('Clix Flutter Integration Example')),
      ),
    );
  }
}

