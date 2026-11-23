// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "DoIt",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "DoItKit",
            targets: ["DoItKit"]
        )
    ],
    targets: [
        .target(
            name: "DoItKit",
            path: "Sources/DoIt",
            resources: [
                .process("Resources")
            ]
        ),
        .testTarget(
            name: "DoItTests",
            dependencies: ["DoItKit"],
            path: "Tests/DoItTests"
        )
    ]
)
