import { promises as fs } from "fs";
import path from "path";

// @ts-ignore - no type definitions available
import svgPathParser from "svg-path-parser";
import { parseSync } from "svgson";
import { optimize } from "svgo";
import PptxGenJS from "pptxgenjs";

import { paths } from "./build/paths.js";
import { error, info, success } from "./build/utils.js";
import { fillMap } from "./config.js";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
const parseSVG = svgPathParser.parseSVG || svgPathParser;

type PptxPoint =
    | { moveTo?: boolean; x: number; y: number }
    | {
          curve: {
              type: "cubic";
              x1: number;
              x2: number;
              y1: number;
              y2: number;
          };
          x: number;
          y: number;
      }
    | {
          curve: { type: "quadratic"; x1: number; y1: number };
          x: number;
          y: number;
      }
    | { close: true };

interface PathWithStyle {
    fill?: string;
    points: PptxPoint[];
}

interface ParsedSvgShape {
    paths: PathWithStyle[];
    viewBox: { height: number; width: number };
}

interface SvgNode {
    attributes?: Record<string, string>;
    children?: SvgNode[];
    name?: string;
}

interface SvgCommand {
    code: string;
    x?: number;
    x1?: number;
    x2?: number;
    y?: number;
    y1?: number;
    y2?: number;
}

// Invert fillMap: CSS variable -> hex color (without #)
// This is mildly dumb since we apply these when we generate the svgs, but we need the fills back for PPT!
const CSS_VAR_COLORS: Record<string, string> = Object.fromEntries(
    Object.entries(fillMap)
        .filter(([, value]) => value && value !== "null")
        .map(([key, value]) => [value, key.replace("#", "")])
);

async function generatePowerPoint() {
    info("Starting PowerPoint generation with vector shapes...");

    // Collect icons
    const iconDir = paths.src("Icon");
    const iconFiles = await fs.readdir(iconDir);
    const selectedIcons = iconFiles
        .filter((file) => file.includes("64"))
        .filter(
            (file) =>
                !["Duotone", "Fill", "Service"].some((i) => file.includes(i))
        )
        .map((file) => ({ dir: iconDir, file }));

    // Collect spots
    const spotDir = paths.src("Spot");
    const spotFiles = (await fs.readdir(spotDir))
        .filter((f) => f.endsWith(".svg"))
        .filter((file) => !["Error", "Loading"].some((i) => file.includes(i)))
        .map((file) => ({ dir: spotDir, file }));

    // Combine both
    const allItems = [...selectedIcons, ...spotFiles];

    info(
        `Found ${selectedIcons.length} icons and ${spotFiles.length} spots to process (${allItems.length} total)`
    );

    // Create PowerPoint presentation
    info("Creating PowerPoint presentation...");
    const pptx = new PptxGenJS.default();

    // Set to 16:9 aspect ratio for Google Slides compatibility
    pptx.layout = "LAYOUT_16x9";

    // Grid layout configuration
    const ICONS_PER_ROW = 6;
    const ICONS_PER_PAGE = 18;
    const ICON_SIZE = 1.1;
    const SPACING = 0.5;
    const START_X = 0.5;
    const START_Y = 0.6;

    // Process items in batches for multiple slides if needed
    for (
        let pageIndex = 0;
        pageIndex < Math.ceil(allItems.length / ICONS_PER_PAGE);
        pageIndex++
    ) {
        const slide = pptx.addSlide();

        // Get items for this page
        const pageItems = allItems.slice(
            pageIndex * ICONS_PER_PAGE,
            (pageIndex + 1) * ICONS_PER_PAGE
        );

        // Place items in grid
        for (let i = 0; i < pageItems.length; i++) {
            const item = pageItems[i];
            if (!item) continue;

            const row = Math.floor(i / ICONS_PER_ROW);
            const col = i % ICONS_PER_ROW;

            const x = START_X + col * (ICON_SIZE + SPACING);
            const y = START_Y + row * (ICON_SIZE + SPACING);

            // Read and parse SVG file
            const svgPath = path.join(item.dir, item.file);
            const svgContent = await fs.readFile(svgPath, "utf8");
            const parsedShape = parseSvgToShapes(svgContent);

            // Add each path as a separate shape
            for (const pathWithStyle of parsedShape.paths) {
                const scaledPoints = scalePointsToShapeLocal(
                    pathWithStyle.points,
                    parsedShape.viewBox,
                    ICON_SIZE
                );

                // Handle colors: hex colors, CSS variables, or default to black
                let fillColor = "000000";
                const normalizedFill = pathWithStyle.fill?.toLowerCase();

                if (normalizedFill) {
                    if (normalizedFill.startsWith("#")) {
                        fillColor = normalizedFill.substring(1);
                    } else if (normalizedFill.startsWith("var(")) {
                        fillColor = CSS_VAR_COLORS[normalizedFill] || "000000";
                    }
                }

                slide.addShape("custGeom", {
                    fill: { color: fillColor },
                    h: ICON_SIZE,
                    line: { type: "none" },
                    points: scaledPoints,
                    w: ICON_SIZE,
                    x,
                    y,
                });
            }

            // Add name label below the item
            const itemName = item.file.replace(".svg", "");
            slide.addText(itemName, {
                align: "center",
                color: "666666",
                fontSize: 8,
                h: 0.25,
                w: ICON_SIZE,
                x,
                y: y + ICON_SIZE + 0.1,
            });
        }
    }

    // Save the PowerPoint file
    const outputPath = paths.build("icons-and-spots.pptx");

    // Ensure build directory exists
    await fs.mkdir(paths.build(), { recursive: true });
    await pptx.writeFile({ fileName: outputPath });

    success(
        `Successfully created PowerPoint with ${selectedIcons.length} icons and ${spotFiles.length} spots (${allItems.length} total) at ${outputPath}`
    );
}

// Parse an SVG string and extract path data suitable for pptxgenjs
function parseSvgToShapes(svgContent: string): ParsedSvgShape {
    // Normalize SVG using svgo: convert shapes to paths, make paths absolute
    // Use minimal optimization to prevent distortion - NO ROUNDING
    const optimized = optimize(svgContent, {
        floatPrecision: 0, // 0 = no rounding, preserve all decimals
        multipass: false, // Single pass to prevent aggressive optimization
        plugins: [
            // Only convert shapes to paths (needed for PowerPoint)
            {
                name: "convertShapeToPath",
                params: {
                    convertArcs: false, // Keep arcs as-is
                },
            },
        ],
    });

    // Parse normalized SVG to JSON
    const svgJson = parseSync(optimized.data) as SvgNode;

    // Extract viewBox
    const viewBoxAttr = svgJson.attributes?.["viewBox"] || "0 0 64 64";
    const parts = viewBoxAttr.split(" ").map(Number);
    const width = parts[2] || 64;
    const height = parts[3] || 64;

    // Find all path elements with their fill colors
    const paths: PathWithStyle[] = [];

    function extractPaths(node: SvgNode) {
        if (node.name === "path" && node.attributes?.d) {
            const pathData = node.attributes.d;
            const points = convertSvgPathToPptxPoints(pathData);
            if (points.length > 0) {
                const fill = node.attributes["fill"];
                paths.push({
                    fill: fill && fill !== "none" ? fill : undefined,
                    points,
                });
            }
        }

        if (node.children) {
            node.children.forEach(extractPaths);
        }
    }

    extractPaths(svgJson);

    return {
        paths,
        viewBox: { height, width },
    };
}

// Convert SVG path data to pptxgenjs points format
// SVG paths are normalized by svgo, but we use makeAbsolute as a safety check
function convertSvgPathToPptxPoints(pathData: string): PptxPoint[] {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const commands = parseSVG(pathData) as SvgCommand[];
    const points: PptxPoint[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];

        switch (cmd?.code) {
            case "M": // MoveTo
                points.push({
                    moveTo: true,
                    x: cmd.x ?? 0,
                    y: cmd.y ?? 0,
                });
                break;

            case "L": // LineTo
                points.push({
                    x: cmd.x ?? 0,
                    y: cmd.y ?? 0,
                });
                break;

            case "C": // Cubic Bezier
                points.push({
                    curve: {
                        type: "cubic",
                        x1: cmd.x1 ?? 0,
                        x2: cmd.x2 ?? 0,
                        y1: cmd.y1 ?? 0,
                        y2: cmd.y2 ?? 0,
                    },
                    x: cmd.x ?? 0,
                    y: cmd.y ?? 0,
                });
                break;

            case "Q": // Quadratic Bezier
                points.push({
                    curve: {
                        type: "quadratic",
                        x1: cmd.x1 ?? 0,
                        y1: cmd.y1 ?? 0,
                    },
                    x: cmd.x ?? 0,
                    y: cmd.y ?? 0,
                });
                break;

            case "Z": // ClosePath
            case "z":
                points.push({ close: true });
                break;

            // Handle other commands as line segments
            case "H": // Horizontal line
                if (i > 0) {
                    const prevPoint = points[points.length - 1];
                    if (prevPoint && "y" in prevPoint) {
                        points.push({
                            x: cmd.x ?? 0,
                            y: prevPoint.y,
                        });
                    }
                }
                break;

            case "V": // Vertical line
                if (i > 0) {
                    const prevPoint = points[points.length - 1];
                    if (prevPoint && "x" in prevPoint) {
                        points.push({
                            x: prevPoint.x,
                            y: cmd.y ?? 0,
                        });
                    }
                }
                break;
        }
    }

    return points;
}

// Scale points from SVG viewBox coordinates to PowerPoint shape-local coordinates
//CUSTOM_GEOMETRY expects coordinates relative to the shape's width and height
function scalePointsToShapeLocal(
    points: PptxPoint[],
    viewBox: { height: number; width: number },
    targetSize: number // target size in inches (both width and height for square icons)
): PptxPoint[] {
    // For custom geometry, coordinates are in the same units as the shape size
    // If shape is 1.2" x 1.2", then coordinates range from 0 to 1.2
    const scaleX = targetSize / viewBox.width;
    const scaleY = targetSize / viewBox.height;

    return points.map((point): PptxPoint => {
        if ("close" in point) {
            return point;
        }

        const scaled: PptxPoint = {
            x: point.x * scaleX,
            y: point.y * scaleY,
        };

        if ("moveTo" in point) {
            (scaled as { moveTo?: boolean }).moveTo = point.moveTo;
        }

        if ("curve" in point) {
            const curve = {
                ...point.curve,
                x1: point.curve.x1 * scaleX,
                y1: point.curve.y1 * scaleY,
            };

            if ("x2" in point.curve) {
                (curve as { x2?: number; y2?: number }).x2 =
                    point.curve.x2 * scaleX;
                (curve as { x2?: number; y2?: number }).y2 =
                    point.curve.y2 * scaleY;
            }

            (scaled as { curve?: typeof curve }).curve = curve;
        }

        return scaled;
    });
}

// Run the script
void (async () => {
    try {
        await generatePowerPoint();
    } catch (e) {
        error(e);
        process.exit(1);
    }
})();
