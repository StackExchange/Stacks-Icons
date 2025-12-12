import { promises as fs } from "fs";
import path from "path";
import PptxGenJS from "pptxgenjs";
import { paths } from "./build/paths.js";
import { error, info, success } from "./build/utils.js";
import { parseSync } from "svgson";
// @ts-ignore - no type definitions available
import svgPathParser from "svg-path-parser";

const parseSVG = svgPathParser.parseSVG || svgPathParser;
const makeAbsolute = svgPathParser.makeAbsolute;

type PptxPoint =
    | { x: number; y: number; moveTo?: boolean }
    | { x: number; y: number; curve: { type: "cubic"; x1: number; y1: number; x2: number; y2: number } }
    | { x: number; y: number; curve: { type: "quadratic"; x1: number; y1: number } }
    | { close: true };

interface PathWithStyle {
    points: PptxPoint[];
    fill?: string;
}

interface ParsedSvgShape {
    paths: PathWithStyle[];
    viewBox: { width: number; height: number };
}

async function generatePowerPoint() {
    info("Starting PowerPoint generation with vector shapes...");

    const iconDir = paths.src("Icon");
    const allFiles = await fs.readdir(iconDir);

    const selects = allFiles
        .filter((file) => file.includes("64")) // Include
        .filter((file) => !["Duotone", "Fill", "Service"].some(i => file.includes(i))) // Exclude

    info(`Found ${selects.length} icons to process`);

    // Create PowerPoint presentation
    info("Creating PowerPoint presentation...");
    const pptx = new PptxGenJS.default();

    // Set to 16:9 aspect ratio for Google Slides compatibility
    pptx.layout = "LAYOUT_16x9";

    // Grid layout configuration
    const ICONS_PER_ROW = 6;
    const ICONS_PER_PAGE = 12;
    const ICON_SIZE = 1.1;
    const SPACING = 0.5;
    const START_X = 0.5;
    const START_Y = 0.6;

    // Process icons in batches for multiple slides if needed
    for (
        let pageIndex = 0;
        pageIndex < Math.ceil(selects.length / ICONS_PER_PAGE);
        pageIndex++
    ) {
        const slide = pptx.addSlide();

        // Get icons for this page
        const pageIcons = selects.slice(
            pageIndex * ICONS_PER_PAGE,
            (pageIndex + 1) * ICONS_PER_PAGE
        );

        // Place icons in grid
        for (let i = 0; i < pageIcons.length; i++) {
            const file = pageIcons[i];
            if (!file) continue;

            const row = Math.floor(i / ICONS_PER_ROW);
            const col = i % ICONS_PER_ROW;

            const x = START_X + col * (ICON_SIZE + SPACING);
            const y = START_Y + row * (ICON_SIZE + SPACING);

            // Read and parse SVG file
            const svgPath = path.join(iconDir, file);
            const svgContent = await fs.readFile(svgPath, "utf8");
            const parsedShape = parseSvgToShapes(svgContent);

            // Add each path as a separate shape
            for (const pathWithStyle of parsedShape.paths) {
                const scaledPoints = scalePointsToShapeLocal(
                    pathWithStyle.points,
                    parsedShape.viewBox,
                    ICON_SIZE
                );

                // Dist files either have no fill (defaults to black) or hex colors like #1868db
                const fillColor = pathWithStyle.fill?.startsWith("#")
                    ? pathWithStyle.fill.substring(1)
                    : "000000";

                slide.addShape("custGeom" as any, {
                    x,
                    y,
                    w: ICON_SIZE,
                    h: ICON_SIZE,
                    points: scaledPoints,
                    fill: { color: fillColor },
                    line: { type: "none" },
                });
            }

            // Add icon name label below the icon
            const iconName = file.replace(".svg", "");
            slide.addText(iconName, {
                x,
                y: y + ICON_SIZE + 0.1,
                w: ICON_SIZE,
                h: 0.25,
                fontSize: 8,
                align: "center",
                color: "666666",
            });
        }
    }

    // Save the PowerPoint file
    const outputPath = paths.build("icons.pptx");

    // Ensure build directory exists
    await fs.mkdir(paths.build(), { recursive: true });
    await pptx.writeFile({ fileName: outputPath });

    success(
        `Successfully created PowerPoint with ${selects.length} icons at ${outputPath}`
    );
}


// Parse an SVG string and extract path data suitable for pptxgenjs
function parseSvgToShapes(svgContent: string): ParsedSvgShape {
    // Parse SVG to JSON
    const svgJson = parseSync(svgContent);

    // Extract viewBox
    const viewBoxAttr = svgJson.attributes["viewBox"] || "0 0 64 64";
    const parts = viewBoxAttr.split(" ").map(Number);
    const width = parts[2] || 64;
    const height = parts[3] || 64;

    // Find all path elements with their fill colors
    const paths: PathWithStyle[] = [];

    function extractPaths(node: any) {
        if (node.name === "path" && node.attributes.d) {
            const pathData = node.attributes.d;
            const points = convertSvgPathToPptxPoints(pathData);
            if (points.length > 0) {
                const fill = node.attributes["fill"];
                paths.push({
                    points,
                    fill: fill && fill !== "none" ? fill : undefined,
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
        viewBox: { width, height },
    };
}

// Convert SVG path data to pptxgenjs points format
// SVG coordinates are absolute, pptxgenjs expects coordinates in inches
function convertSvgPathToPptxPoints(pathData: string): PptxPoint[] {
    const commands = makeAbsolute(parseSVG(pathData));
    const points: PptxPoint[] = [];

    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];

        switch (cmd.code) {
            case "M": // MoveTo
                points.push({
                    x: cmd.x,
                    y: cmd.y,
                    moveTo: true,
                });
                break;

            case "L": // LineTo
                points.push({
                    x: cmd.x,
                    y: cmd.y,
                });
                break;

            case "C": // Cubic Bezier
                points.push({
                    x: cmd.x,
                    y: cmd.y,
                    curve: {
                        type: "cubic",
                        x1: cmd.x1,
                        y1: cmd.y1,
                        x2: cmd.x2,
                        y2: cmd.y2,
                    },
                });
                break;

            case "Q": // Quadratic Bezier
                points.push({
                    x: cmd.x,
                    y: cmd.y,
                    curve: {
                        type: "quadratic",
                        x1: cmd.x1,
                        y1: cmd.y1,
                    },
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
                            x: cmd.x,
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
                            y: cmd.y,
                        });
                    }
                }
                break;
        }
    }

    return points;
}

/**
 * Scale points from SVG viewBox coordinates to PowerPoint shape-local coordinates
 * CUSTOM_GEOMETRY expects coordinates relative to the shape's width and height
 *
 * @param points - Array of points in SVG coordinate space
 * @param viewBox - SVG viewBox dimensions
 * @param targetSize - Target size of the shape in inches
 * @returns Points scaled to shape-local coordinate system (0 to targetSize)
 */
function scalePointsToShapeLocal(
    points: PptxPoint[],
    viewBox: { width: number; height: number },
    targetSize: number // target size in inches (both width and height for square icons)
): PptxPoint[] {
    // For custom geometry, coordinates are in the same units as the shape size
    // If shape is 1.2" x 1.2", then coordinates range from 0 to 1.2
    const scaleX = targetSize / viewBox.width;
    const scaleY = targetSize / viewBox.height;

    return points.map((point) => {
        if ("close" in point) {
            return point;
        }

        const scaled: any = {
            x: point.x * scaleX,
            y: point.y * scaleY,
        };

        if ("moveTo" in point) {
            scaled.moveTo = point.moveTo;
        }

        if ("curve" in point) {
            scaled.curve = {
                ...point.curve,
                x1: point.curve.x1 * scaleX,
                y1: point.curve.y1 * scaleY,
            };

            if ("x2" in point.curve) {
                scaled.curve.x2 = point.curve.x2 * scaleX;
                scaled.curve.y2 = point.curve.y2 * scaleY;
            }
        }

        return scaled;
    });
}

// Run the script
(async () => {
    try {
        await generatePowerPoint();
    } catch (e) {
        error(e);
        process.exit(1);
    }
})();
