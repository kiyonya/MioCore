import { type CategloriesNotation, type ProjectType } from "./multiple_api.ts";

export const CATEGLORIES:Record<ProjectType,Record<string,CategloriesNotation>> = {
  "mod": {
    "adventure": {
      "name": "adventure",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><polygon points=\"16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76\"/></svg>",
      "type": "mod",
      "curseforgeCate": 422,
      "modrinthCate": "categories:adventure",
      "zhName": "冒险"
    },
    "cursed": {
      "name": "cursed",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"7\" y=\"7.5\" width=\"10\" height=\"14\" rx=\"5\"/><polyline points=\"2 12.5 4 14.5 7 14.5\"/><polyline points=\"22 12.5 20 14.5 17 14.5\"/><polyline points=\"3 21.5 5 18.5 7 17.5\"/><polyline points=\"21 21.5 19 18.5 17 17.5\"/><polyline points=\"3 8.5 5 10.5 7 11.5\"/><polyline points=\"21 8.5 19 10.5 17 11.5\"/><line x1=\"12\" y1=\"7.5\" x2=\"12\" y2=\"21.5\"/><path d=\"M15.38,8.82A3,3,0,0,0,16,7h0a3,3,0,0,0-3-3H11A3,3,0,0,0,8,7H8a3,3,0,0,0,.61,1.82\"/><line x1=\"9\" y1=\"4.5\" x2=\"8\" y2=\"2.5\"/><line x1=\"15\" y1=\"4.5\" x2=\"16\" y2=\"2.5\"/></svg>",
      "type": "mod",
      "curseforgeCate": null,
      "modrinthCate": "categories:cursed",
      "zhName": "诅咒"
    },
    "decoration": {
      "name": "decoration",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/><polyline points=\"9 22 9 12 15 12 15 22\"/></svg>",
      "type": "mod",
      "curseforgeCate": null,
      "modrinthCate": "categories:decoration",
      "zhName": "装饰"
    },
    "economy": {
      "name": "economy",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"23\"/><path d=\"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6\"/></svg>",
      "type": "mod",
      "curseforgeCate": null,
      "modrinthCate": "categories:economy",
      "zhName": "经济"
    },
    "equipment": {
      "name": "equipment",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17.573 20.038L3.849 7.913 2.753 2.755 7.838 4.06 19.47 18.206l-1.898 1.832z\"/><path d=\"M7.45 14.455l-3.043 3.661 1.887 1.843 3.717-3.25\"/><path d=\"M16.75 10.82l3.333-2.913 1.123-5.152-5.091 1.28-2.483 2.985\"/><path d=\"M21.131 16.602l-5.187 5.01 2.596-2.508 2.667 2.761\"/><path d=\"M2.828 16.602l5.188 5.01-2.597-2.508-2.667 2.761\"/></svg>",
      "type": "mod",
      "curseforgeCate": null,
      "modrinthCate": "categories:equipment",
      "zhName": "装备"
    },
    "food": {
      "name": "food",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.46-2.46\"></path><path d=\"M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z\"></path><path d=\"M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z\"></path></svg>",
      "type": "mod",
      "curseforgeCate": 436,
      "modrinthCate": "categories:food",
      "zhName": "食物"
    },
    "game-mechanics": {
      "name": "game-mechanics",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"4\" y1=\"21\" x2=\"4\" y2=\"14\"/><line x1=\"4\" y1=\"10\" x2=\"4\" y2=\"3\"/><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"12\"/><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"3\"/><line x1=\"20\" y1=\"21\" x2=\"20\" y2=\"16\"/><line x1=\"20\" y1=\"12\" x2=\"20\" y2=\"3\"/><line x1=\"1\" y1=\"14\" x2=\"7\" y2=\"14\"/><line x1=\"9\" y1=\"8\" x2=\"15\" y2=\"8\"/><line x1=\"17\" y1=\"16\" x2=\"23\" y2=\"16\"/></svg>",
      "type": "mod",
      "curseforgeCate": null,
      "modrinthCate": "categories:game-mechanics",
      "zhName": "游戏机制"
    },
    "library": {
      "name": "library",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 19.5A2.5 2.5 0 0 1 6.5 17H20\"/><path d=\"M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z\"/></svg>",
      "type": "mod",
      "curseforgeCate": 421,
      "modrinthCate": "categories:library",
      "zhName": "支持库"
    },
    "magic": {
      "name": "magic",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M15 4V2\"></path><path d=\"M15 16v-2\"></path><path d=\"M8 9h2\"></path><path d=\"M20 9h2\"></path><path d=\"M17.8 11.8 19 13\"></path><path d=\"M15 9h0\"></path><path d=\"M17.8 6.2 19 5\"></path><path d=\"m3 21 9-9\"></path><path d=\"M12.2 6.2 11 5\"></path></svg>",
      "type": "mod",
      "curseforgeCate": 419,
      "modrinthCate": "categories:magic",
      "zhName": "魔法"
    },
    "management": {
      "name": "management",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"2\" width=\"20\" height=\"8\" rx=\"2\" ry=\"2\"/><rect x=\"2\" y=\"14\" width=\"20\" height=\"8\" rx=\"2\" ry=\"2\"/><line x1=\"6\" y1=\"6\" x2=\"6.01\" y2=\"6\"/><line x1=\"6\" y1=\"18\" x2=\"6.01\" y2=\"18\"/></svg>",
      "type": "mod",
      "curseforgeCate": null,
      "modrinthCate": "categories:management",
      "zhName": "管理"
    },
    "minigame": {
      "name": "minigame",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"8\" r=\"7\"/><polyline points=\"8.21 13.89 7 23 12 20 17 23 15.79 13.88\"/></svg>",
      "type": "mod",
      "curseforgeCate": null,
      "modrinthCate": "categories:minigame",
      "zhName": "小游戏"
    },
    "mobs": {
      "name": "mobs",
      "icon": "<svg xml:space=\"preserve\" fill-rule=\"evenodd\" stroke-linejoin=\"round\" stroke-miterlimit=\"1.5\" clip-rule=\"evenodd\" viewBox=\"0 0 24 24\">\n  <path fill=\"none\" d=\"M0 0h24v24H0z\"/>\n  <path fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" d=\"M3 3h18v18H3z\"/>\n  <path stroke=\"currentColor\" fill=\"currentColor\" d=\"M6 6h4v4H6zm8 0h4v4h-4zm-4 4h4v2h2v6h-2v-2h-4v2H8v-6h2v-2Z\"/>\n</svg>",
      "type": "mod",
      "curseforgeCate": null,
      "modrinthCate": "categories:mobs",
      "zhName": "生物"
    },
    "optimization": {
      "name": "optimization",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polygon points=\"13 2 3 14 12 14 11 22 21 10 12 10 13 2\"/></svg>",
      "type": "mod",
      "curseforgeCate": null,
      "modrinthCate": "categories:optimization",
      "zhName": "优化"
    },
    "social": {
      "name": "social",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z\"/></svg>",
      "type": "mod",
      "curseforgeCate": null,
      "modrinthCate": "categories:social",
      "zhName": "社交"
    },
    "storage": {
      "name": "storage",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"21 8 21 21 3 21 3 8\"/><rect x=\"1\" y=\"3\" width=\"22\" height=\"5\"/><line x1=\"10\" y1=\"12\" x2=\"14\" y2=\"12\"/></svg>",
      "type": "mod",
      "curseforgeCate": 420,
      "modrinthCate": "categories:storage",
      "zhName": "存储"
    },
    "technology": {
      "name": "technology",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"22\" y1=\"12\" x2=\"2\" y2=\"12\"/><path d=\"M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\"/><line x1=\"6\" y1=\"16\" x2=\"6.01\" y2=\"16\"/><line x1=\"10\" y1=\"16\" x2=\"10.01\" y2=\"16\"/></svg>",
      "type": "mod",
      "curseforgeCate": 412,
      "modrinthCate": "categories:technology",
      "zhName": "科技"
    },
    "transportation": {
      "name": "transportation",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"1\" y=\"3\" width=\"15\" height=\"13\"/><polygon points=\"16 8 20 8 23 11 23 16 16 16 16 8\"/><circle cx=\"5.5\" cy=\"18.5\" r=\"2.5\"/><circle cx=\"18.5\" cy=\"18.5\" r=\"2.5\"/></svg>",
      "type": "mod",
      "curseforgeCate": null,
      "modrinthCate": "categories:transportation",
      "zhName": "运输"
    },
    "utility": {
      "name": "utility",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"7\" width=\"20\" height=\"14\" rx=\"2\" ry=\"2\"/><path d=\"M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\"/></svg>",
      "type": "mod",
      "curseforgeCate": 5191,
      "modrinthCate": "categories:utility",
      "zhName": "实用"
    },
    "worldgen": {
      "name": "worldgen",
      "icon": "<svg fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\" stroke-width=\"2\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z\" /></svg>",
      "type": "mod",
      "curseforgeCate": 406,
      "modrinthCate": "categories:worldgen",
      "zhName": "世界生成"
    },
    "miscellaneous": {
      "name": "Miscellaneous",
      "curseforgeCate": 425,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/6/40/635351497693711265.png",
      "type": "mod",
      "zhName": "杂项"
    },
    "cosmetic": {
      "name": "Cosmetic",
      "curseforgeCate": 424,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/6/39/635351497555976928.png",
      "type": "mod",
      "zhName": "美化"
    },
    "education": {
      "name": "Education",
      "curseforgeCate": 5299,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/522/431/637843331461575794.png",
      "type": "mod",
      "zhName": "教育"
    },
    "map and information": {
      "name": "Map and Information",
      "curseforgeCate": 423,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/6/38/635351497437388438.png",
      "type": "mod",
      "zhName": "地图和信息"
    },
    "addons": {
      "name": "Addons",
      "curseforgeCate": 426,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/5/998/635351477886290676.png",
      "type": "mod",
      "zhName": "插件"
    },
    "armor, tools, and weapons": {
      "name": "Armor, Tools, and Weapons",
      "curseforgeCate": 434,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/6/47/635351498790409758.png",
      "type": "mod",
      "zhName": "盔甲,工具,和武器"
    },
    "adventure and rpg": {
      "name": "Adventure and RPG",
      "curseforgeCate": 422,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/6/37/635351497295252123.png",
      "type": "mod",
      "zhName": "冒险与RPG"
    },
    "redstone": {
      "name": "Redstone",
      "curseforgeCate": 4558,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/32/937/635888173116238506.png",
      "type": "mod",
      "zhName": "红石"
    },
    "performance": {
      "name": "Performance",
      "curseforgeCate": 6814,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/933/987/638409849610531091.png",
      "type": "mod",
      "zhName": "性能优化"
    },
    "bug fixes": {
      "name": "Bug Fixes",
      "curseforgeCate": 6821,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/934/473/638410713616155958.png",
      "type": "mod",
      "zhName": "错误修复"
    },
    "creativemode": {
      "name": "CreativeMode",
      "curseforgeCate": 9026,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/1478/817/638961161997981312.png",
      "type": "mod",
      "zhName": "创造模式"
    }
  },
  "modpack": {
    "adventure": {
      "name": "adventure",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><polygon points=\"16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76\"/></svg>",
      "type": "modpack",
      "curseforgeCate": null,
      "modrinthCate": "categories:adventure",
      "zhName": "冒险"
    },
    "challenging": {
      "name": "challenging",
      "icon": "<svg fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\" stroke-width=\"2\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z\" /></svg>",
      "type": "modpack",
      "curseforgeCate": null,
      "modrinthCate": "categories:challenging",
      "zhName": "挑战性"
    },
    "combat": {
      "name": "combat",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17.573 20.038L3.849 7.913 2.753 2.755 7.838 4.06 19.47 18.206l-1.898 1.832z\"/><path d=\"M7.45 14.455l-3.043 3.661 1.887 1.843 3.717-3.25\"/><path d=\"M16.75 10.82l3.333-2.913 1.123-5.152-5.091 1.28-2.483 2.985\"/><path d=\"M21.131 16.602l-5.187 5.01 2.596-2.508 2.667 2.761\"/><path d=\"M2.828 16.602l5.188 5.01-2.597-2.508-2.667 2.761\"/></svg>",
      "type": "modpack",
      "curseforgeCate": 4483,
      "modrinthCate": "categories:combat",
      "zhName": "战斗"
    },
    "kitchen-sink": {
      "name": "kitchen-sink",
      "icon": "<svg viewBox=\"0 0 24 24\" xml:space=\"preserve\"><g fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m19.9 14-1.4 4.9c-.3 1-1.1 1.7-2.1 1.7H7.6c-.9 0-1.8-.7-2.1-1.7L4.1 14h15.8zM12 10V4.5M12 4.5c0-1.2.9-2.1 2.1-2.1M14.1 2.4c1.2 0 2.1.9 2.1 2.1M22.2 12c0 .6-.2 1.1-.6 1.4-.4.4-.9.6-1.4.6H3.8c-1.1 0-2-.9-2-2 0-.6.2-1.1.6-1.4.4-.4.9-.6 1.4-.6h16.4c1.1 0 2 .9 2 2z\"/></g><path fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M16.2 7.2h0\"/></svg>",
      "type": "modpack",
      "curseforgeCate": null,
      "modrinthCate": "categories:kitchen-sink",
      "zhName": "大杂烩"
    },
    "lightweight": {
      "name": "lightweight",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z\"></path><line x1=\"16\" y1=\"8\" x2=\"2\" y2=\"22\"></line><line x1=\"17.5\" y1=\"15\" x2=\"9\" y2=\"15\"></line></svg>\n",
      "type": "modpack",
      "curseforgeCate": 4481,
      "modrinthCate": "categories:lightweight",
      "zhName": "轻量"
    },
    "magic": {
      "name": "magic",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M15 4V2\"></path><path d=\"M15 16v-2\"></path><path d=\"M8 9h2\"></path><path d=\"M20 9h2\"></path><path d=\"M17.8 11.8 19 13\"></path><path d=\"M15 9h0\"></path><path d=\"M17.8 6.2 19 5\"></path><path d=\"m3 21 9-9\"></path><path d=\"M12.2 6.2 11 5\"></path></svg>",
      "type": "modpack",
      "curseforgeCate": 4473,
      "modrinthCate": "categories:magic",
      "zhName": "魔法"
    },
    "multiplayer": {
      "name": "multiplayer",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"></path><circle cx=\"9\" cy=\"7\" r=\"4\"></circle><path d=\"M23 21v-2a4 4 0 0 0-3-3.87\"></path><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"></path></svg>",
      "type": "modpack",
      "curseforgeCate": 4484,
      "modrinthCate": "categories:multiplayer",
      "zhName": "多人游戏"
    },
    "optimization": {
      "name": "optimization",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polygon points=\"13 2 3 14 12 14 11 22 21 10 12 10 13 2\"/></svg>",
      "type": "modpack",
      "curseforgeCate": null,
      "modrinthCate": "categories:optimization",
      "zhName": "优化"
    },
    "quests": {
      "name": "quests",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"9\" y=\"2\" width=\"6\" height=\"6\"></rect><rect x=\"16\" y=\"16\" width=\"6\" height=\"6\"></rect><rect x=\"2\" y=\"16\" width=\"6\" height=\"6\"></rect><path d=\"M12 8v4m0 0H5v4m7-4h7v4\"></path></svg>",
      "type": "modpack",
      "curseforgeCate": 4478,
      "modrinthCate": "categories:quests",
      "zhName": "任务"
    },
    "technology": {
      "name": "technology",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"22\" y1=\"12\" x2=\"2\" y2=\"12\"/><path d=\"M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\"/><line x1=\"6\" y1=\"16\" x2=\"6.01\" y2=\"16\"/><line x1=\"10\" y1=\"16\" x2=\"10.01\" y2=\"16\"/></svg>",
      "type": "modpack",
      "curseforgeCate": 4472,
      "modrinthCate": "categories:technology",
      "zhName": "科技"
    },
    "adventure and rpg": {
      "name": "Adventure and RPG",
      "curseforgeCate": 4475,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/14/480/635596775049811800.png",
      "type": "modpack",
      "zhName": "冒险与RPG"
    },
    "ftb official pack": {
      "name": "FTB Official Pack",
      "curseforgeCate": 4487,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/15/166/635616941825349689.png",
      "type": "modpack",
      "zhName": "ftb官方包"
    },
    "sci-fi": {
      "name": "Sci-Fi",
      "curseforgeCate": 4474,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/14/323/635591780581068715.png",
      "type": "modpack",
      "zhName": "科幻"
    },
    "hardcore": {
      "name": "Hardcore",
      "curseforgeCate": 4479,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/14/473/635596760504656528.png",
      "type": "modpack",
      "zhName": "硬核"
    },
    "mini game": {
      "name": "Mini Game",
      "curseforgeCate": 4477,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/15/517/635627406184649114.png",
      "type": "modpack",
      "zhName": "小游戏"
    },
    "extra large": {
      "name": "Extra Large",
      "curseforgeCate": 4482,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/14/472/635596760403562826.png",
      "type": "modpack",
      "zhName": "超大型"
    },
    "skyblock": {
      "name": "Skyblock",
      "curseforgeCate": 4736,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/162/818/636678840408956323.png",
      "type": "modpack",
      "zhName": "空岛"
    },
    "map based": {
      "name": "Map Based",
      "curseforgeCate": 4480,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/14/475/635596760683250342.png",
      "type": "modpack",
      "zhName": "基于地图"
    },
    "exploration": {
      "name": "Exploration",
      "curseforgeCate": 4476,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/14/486/635596815896417213.png",
      "type": "modpack",
      "zhName": "探索"
    },
    "vanilla+": {
      "name": "Vanilla+",
      "curseforgeCate": 5128,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/451/388/637713564446392425.png",
      "type": "modpack",
      "zhName": "超越原版"
    },
    "horror": {
      "name": "Horror",
      "curseforgeCate": 7418,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/1062/213/638594627103104125.png",
      "type": "modpack",
      "zhName": "恐怖"
    }
  },
  "datapack": {
    "magic": {
      "name": "Magic",
      "curseforgeCate": 6952,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/944/333/638428201403204473.png",
      "type": "datapack",
      "zhName": "魔法"
    },
    "miscellaneous": {
      "name": "Miscellaneous",
      "curseforgeCate": 6947,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/944/328/638428200699783193.png",
      "type": "datapack",
      "zhName": "杂项"
    },
    "fantasy": {
      "name": "Fantasy",
      "curseforgeCate": 6949,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/944/330/638428201112583545.png",
      "type": "datapack",
      "zhName": "奇幻"
    },
    "mod support": {
      "name": "Mod Support",
      "curseforgeCate": 6946,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/944/327/638428200626712952.png",
      "type": "datapack",
      "zhName": "前置模组"
    },
    "tech": {
      "name": "Tech",
      "curseforgeCate": 6951,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/944/332/638428201353514419.png",
      "type": "datapack",
      "zhName": "科技"
    },
    "library": {
      "name": "Library",
      "curseforgeCate": 6950,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/944/331/638428201198663675.png",
      "type": "datapack",
      "zhName": "支持库"
    },
    "utility": {
      "name": "Utility",
      "curseforgeCate": 6953,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/944/335/638428201486034664.png",
      "type": "datapack",
      "zhName": "实用"
    },
    "adventure": {
      "name": "Adventure",
      "curseforgeCate": 6948,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/944/329/638428201021533304.png",
      "type": "datapack",
      "zhName": "冒险"
    }
  },
  "resourcepack": {
    "128x": {
      "name": "128x",
      "icon": "",
      "type": "resourcepack",
      "curseforgeCate": 396,
      "modrinthCate": "resolutions:128x",
      "zhName": "128x"
    },
    "16x": {
      "name": "16x",
      "icon": "",
      "type": "resourcepack",
      "curseforgeCate": 393,
      "modrinthCate": "resolutions:16x",
      "zhName": "16x"
    },
    "256x": {
      "name": "256x",
      "icon": "",
      "type": "resourcepack",
      "curseforgeCate": 397,
      "modrinthCate": "resolutions:256x",
      "zhName": "256x"
    },
    "32x": {
      "name": "32x",
      "icon": "",
      "type": "resourcepack",
      "curseforgeCate": 394,
      "modrinthCate": "resolutions:32x",
      "zhName": "32x"
    },
    "48x": {
      "name": "48x",
      "icon": "",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "resolutions:48x",
      "zhName": "48x"
    },
    "512x+": {
      "name": "512x+",
      "icon": "",
      "type": "resourcepack",
      "curseforgeCate": 398,
      "modrinthCate": "resolutions:512x+",
      "zhName": "512x+"
    },
    "64x": {
      "name": "64x",
      "icon": "",
      "type": "resourcepack",
      "curseforgeCate": 395,
      "modrinthCate": "resolutions:64x",
      "zhName": "64x"
    },
    "8x-": {
      "name": "8x-",
      "icon": "",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "resolutions:8x-",
      "zhName": "8x-"
    },
    "audio": {
      "name": "audio",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 18v-6a9 9 0 0 1 18 0v6\"/><path d=\"M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "features:audio",
      "zhName": "音频"
    },
    "blocks": {
      "name": "blocks",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\"/><polyline points=\"3.27 6.96 12 12.01 20.73 6.96\"/><line x1=\"12\" y1=\"22.08\" x2=\"12\" y2=\"12\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "features:blocks",
      "zhName": "方块"
    },
    "combat": {
      "name": "combat",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17.573 20.038L3.849 7.913 2.753 2.755 7.838 4.06 19.47 18.206l-1.898 1.832z\"/><path d=\"M7.45 14.455l-3.043 3.661 1.887 1.843 3.717-3.25\"/><path d=\"M16.75 10.82l3.333-2.913 1.123-5.152-5.091 1.28-2.483 2.985\"/><path d=\"M21.131 16.602l-5.187 5.01 2.596-2.508 2.667 2.761\"/><path d=\"M2.828 16.602l5.188 5.01-2.597-2.508-2.667 2.761\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "categories:combat",
      "zhName": "战斗"
    },
    "core-shaders": {
      "name": "core-shaders",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\" ry=\"2\"/><rect x=\"9\" y=\"9\" width=\"6\" height=\"6\"/><line x1=\"9\" y1=\"1\" x2=\"9\" y2=\"4\"/><line x1=\"15\" y1=\"1\" x2=\"15\" y2=\"4\"/><line x1=\"9\" y1=\"20\" x2=\"9\" y2=\"23\"/><line x1=\"15\" y1=\"20\" x2=\"15\" y2=\"23\"/><line x1=\"20\" y1=\"9\" x2=\"23\" y2=\"9\"/><line x1=\"20\" y1=\"14\" x2=\"23\" y2=\"14\"/><line x1=\"1\" y1=\"9\" x2=\"4\" y2=\"9\"/><line x1=\"1\" y1=\"14\" x2=\"4\" y2=\"14\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "features:core-shaders",
      "zhName": "核心着色器"
    },
    "cursed": {
      "name": "cursed",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"7\" y=\"7.5\" width=\"10\" height=\"14\" rx=\"5\"/><polyline points=\"2 12.5 4 14.5 7 14.5\"/><polyline points=\"22 12.5 20 14.5 17 14.5\"/><polyline points=\"3 21.5 5 18.5 7 17.5\"/><polyline points=\"21 21.5 19 18.5 17 17.5\"/><polyline points=\"3 8.5 5 10.5 7 11.5\"/><polyline points=\"21 8.5 19 10.5 17 11.5\"/><line x1=\"12\" y1=\"7.5\" x2=\"12\" y2=\"21.5\"/><path d=\"M15.38,8.82A3,3,0,0,0,16,7h0a3,3,0,0,0-3-3H11A3,3,0,0,0,8,7H8a3,3,0,0,0,.61,1.82\"/><line x1=\"9\" y1=\"4.5\" x2=\"8\" y2=\"2.5\"/><line x1=\"15\" y1=\"4.5\" x2=\"16\" y2=\"2.5\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "categories:cursed",
      "zhName": "诅咒"
    },
    "decoration": {
      "name": "decoration",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/><polyline points=\"9 22 9 12 15 12 15 22\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "categories:decoration",
      "zhName": "装饰"
    },
    "entities": {
      "name": "entities",
      "icon": "<svg xml:space=\"preserve\" fill-rule=\"evenodd\" stroke-linejoin=\"round\" stroke-miterlimit=\"1.5\" clip-rule=\"evenodd\" viewBox=\"0 0 24 24\">\n  <path fill=\"none\" d=\"M0 0h24v24H0z\"/>\n  <path fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" d=\"M3 3h18v18H3z\"/>\n  <path stroke=\"currentColor\" fill=\"currentColor\" d=\"M6 6h4v4H6zm8 0h4v4h-4zm-4 4h4v2h2v6h-2v-2h-4v2H8v-6h2v-2Z\"/>\n</svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "features:entities",
      "zhName": "实体"
    },
    "environment": {
      "name": "environment",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"]><circle cx=\"12\" cy=\"12\" r=\"5\"/><line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"3\"/><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"23\"/><line x1=\"4.22\" y1=\"4.22\" x2=\"5.64\" y2=\"5.64\"/><line x1=\"18.36\" y1=\"18.36\" x2=\"19.78\" y2=\"19.78\"/><line x1=\"1\" y1=\"12\" x2=\"3\" y2=\"12\"/><line x1=\"21\" y1=\"12\" x2=\"23\" y2=\"12\"/><line x1=\"4.22\" y1=\"19.78\" x2=\"5.64\" y2=\"18.36\"/><line x1=\"18.36\" y1=\"5.64\" x2=\"19.78\" y2=\"4.22\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "features:environment",
      "zhName": "环境"
    },
    "equipment": {
      "name": "equipment",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "features:equipment",
      "zhName": "装备"
    },
    "fonts": {
      "name": "fonts",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"4 7 4 4 20 4 20 7\"/><line x1=\"9\" y1=\"20\" x2=\"15\" y2=\"20\"/><line x1=\"12\" y1=\"4\" x2=\"12\" y2=\"20\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "features:fonts",
      "zhName": "字体"
    },
    "gui": {
      "name": "gui",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"/><line x1=\"3\" y1=\"9\" x2=\"21\" y2=\"9\"/><line x1=\"9\" y1=\"21\" x2=\"9\" y2=\"9\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "features:gui",
      "zhName": "界面"
    },
    "items": {
      "name": "items",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 19.5A2.5 2.5 0 0 1 6.5 17H20\"/><path d=\"M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "features:items",
      "zhName": "物品"
    },
    "locale": {
      "name": "locale",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"2\" y1=\"12\" x2=\"22\" y2=\"12\"></line><path d=\"M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z\"></path></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "features:locale",
      "zhName": "本地化"
    },
    "modded": {
      "name": "modded",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"\\><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"/><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"16\"/><line x1=\"8\" y1=\"12\" x2=\"16\" y2=\"12\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "categories:modded",
      "zhName": "模改"
    },
    "models": {
      "name": "models",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polygon points=\"12 2 2 7 12 12 22 7 12 2\"/><polyline points=\"2 17 12 22 22 17\"/><polyline points=\"2 12 12 17 22 12\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "features:models",
      "zhName": "模型"
    },
    "realistic": {
      "name": "realistic",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\"/><polyline points=\"21 15 16 10 5 21\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": 400,
      "modrinthCate": "categories:realistic",
      "zhName": "写实"
    },
    "simplistic": {
      "name": "simplistic",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "categories:simplistic",
      "zhName": "极简"
    },
    "themed": {
      "name": "themed",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 19l7-7 3 3-7 7-3-3z\"/><path d=\"M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z\"/><path d=\"M2 2l7.586 7.586\"/><circle cx=\"11\" cy=\"11\" r=\"2\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "categories:themed",
      "zhName": "主题"
    },
    "tweaks": {
      "name": "tweaks",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "categories:tweaks",
      "zhName": "微调"
    },
    "utility": {
      "name": "utility",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"7\" width=\"20\" height=\"14\" rx=\"2\" ry=\"2\"/><path d=\"M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "categories:utility",
      "zhName": "实用"
    },
    "vanilla-like": {
      "name": "vanilla-like",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"\" data-darkreader-inline-stroke=\"\"><path d=\"m7 11 4.08 10.35a1 1 0 0 0 1.84 0L17 11\"/><path d=\"M17 7A5 5 0 0 0 7 7\"/><path d=\"M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4\"/></svg>",
      "type": "resourcepack",
      "curseforgeCate": null,
      "modrinthCate": "categories:vanilla-like",
      "zhName": "类原版"
    },
    "steampunk": {
      "name": "Steampunk",
      "curseforgeCate": 399,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/6/50/635351499448616079.png",
      "type": "resourcepack",
      "zhName": "蒸汽朋克"
    },
    "traditional": {
      "name": "Traditional",
      "curseforgeCate": 403,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/6/57/635351500831419880.png",
      "type": "resourcepack",
      "zhName": "原版改良"
    },
    "medieval": {
      "name": "Medieval",
      "curseforgeCate": 402,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/6/56/635351500686687873.png",
      "type": "resourcepack",
      "zhName": "中世纪"
    },
    "miscellaneous": {
      "name": "Miscellaneous",
      "curseforgeCate": 405,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/6/59/635351501101869320.png",
      "type": "resourcepack",
      "zhName": "杂项"
    },
    "animated": {
      "name": "Animated",
      "curseforgeCate": 404,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/6/58/635351500950558738.png",
      "type": "resourcepack",
      "zhName": "动画"
    },
    "modern": {
      "name": "Modern",
      "curseforgeCate": 401,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/6/55/635351500520222907.png",
      "type": "resourcepack",
      "zhName": "现代"
    },
    "mod support": {
      "name": "Mod Support",
      "curseforgeCate": 4465,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/6/623/635363922411546592.png",
      "type": "resourcepack",
      "zhName": "前置模组"
    },
    "data packs": {
      "name": "Data Packs",
      "curseforgeCate": 5193,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/456/553/637727355382131318.png",
      "type": "resourcepack",
      "zhName": "数据包"
    },
    "font packs": {
      "name": "Font Packs",
      "curseforgeCate": 5244,
      "modrinthCate": null,
      "icon": "https://media.forgecdn.net/avatars/493/926/637804403044903691.png",
      "type": "resourcepack",
      "zhName": "字体包"
    }
  },
  "shaderpack": {
    "atmosphere": {
      "name": "atmosphere",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 2v2\"/><path d=\"m4.93 4.93 1.41 1.41\"/><path d=\"M20 12h2\"/><path d=\"m19.07 4.93-1.41 1.41\"/><path d=\"M15.947 12.65a4 4 0 0 0-5.925-4.128\"/><path d=\"M3 20a5 5 0 1 1 8.9-4H13a3 3 0 0 1 2 5.24\"/><path d=\"M11 20v2\"/><path d=\"M7 19v2\"/></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "features:atmosphere",
      "zhName": "氛围"
    },
    "bloom": {
      "name": "bloom",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8 2h8l4 10H4L8 2Z\"/><path d=\"M12 12v6\"/><path d=\"M8 22v-2c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v2H8Z\"/></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "features:bloom",
      "zhName": "泛光"
    },
    "cartoon": {
      "name": "cartoon",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"\" data-darkreader-inline-stroke=\"\"><path d=\"m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08\"/><path d=\"M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z\"/></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "categories:cartoon",
      "zhName": "卡通"
    },
    "colored-lighting": {
      "name": "colored-lighting",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\"><circle cx=\"7.618\" cy=\"6.578\" r=\"5.422\" style=\"\" transform=\"translate(3.143 .726) scale(1.16268)\"/><circle cx=\"7.618\" cy=\"6.578\" r=\"5.422\" style=\"\" transform=\"translate(-.862 7.796) scale(1.16268)\"/><circle cx=\"7.618\" cy=\"6.578\" r=\"5.422\" style=\"\" transform=\"translate(7.148 7.796) scale(1.16268)\"/></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "features:colored-lighting",
      "zhName": "彩色光照"
    },
    "cursed": {
      "name": "cursed",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"7\" y=\"7.5\" width=\"10\" height=\"14\" rx=\"5\"/><polyline points=\"2 12.5 4 14.5 7 14.5\"/><polyline points=\"22 12.5 20 14.5 17 14.5\"/><polyline points=\"3 21.5 5 18.5 7 17.5\"/><polyline points=\"21 21.5 19 18.5 17 17.5\"/><polyline points=\"3 8.5 5 10.5 7 11.5\"/><polyline points=\"21 8.5 19 10.5 17 11.5\"/><line x1=\"12\" y1=\"7.5\" x2=\"12\" y2=\"21.5\"/><path d=\"M15.38,8.82A3,3,0,0,0,16,7h0a3,3,0,0,0-3-3H11A3,3,0,0,0,8,7H8a3,3,0,0,0,.61,1.82\"/><line x1=\"9\" y1=\"4.5\" x2=\"8\" y2=\"2.5\"/><line x1=\"15\" y1=\"4.5\" x2=\"16\" y2=\"2.5\"/></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "categories:cursed",
      "zhName": "诅咒"
    },
    "fantasy": {
      "name": "fantasy",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z\"/><path d=\"m14 7 3 3\"/><path d=\"M5 6v4\"/><path d=\"M19 14v4\"/><path d=\"M10 2v2\"/><path d=\"M7 8H3\"/><path d=\"M21 16h-4\"/><path d=\"M11 3H9\"/></svg>",
      "type": "shaderpack",
      "curseforgeCate": 6554,
      "modrinthCate": "categories:fantasy",
      "zhName": "奇幻"
    },
    "foliage": {
      "name": "foliage",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"\" data-darkreader-inline-stroke=\"\"><path d=\"M12 22v-7l-2-2\"/><path d=\"M17 8v.8A6 6 0 0 1 13.8 20v0H10v0A6.5 6.5 0 0 1 7 8h0a5 5 0 0 1 10 0Z\"/><path d=\"m14 14-2 2\"/></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "features:foliage",
      "zhName": "植被"
    },
    "high": {
      "name": "high",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 20h.01\"></path><path d=\"M7 20v-4\"></path><path d=\"M12 20v-8\"></path><path d=\"M17 20V8\"></path></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "performance impact:high",
      "zhName": "高"
    },
    "low": {
      "name": "low",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 20h.01\"></path><path d=\"M7 20v-4\"></path></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "performance impact:low",
      "zhName": "低"
    },
    "medium": {
      "name": "medium",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 20h.01\"></path><path d=\"M7 20v-4\"></path><path d=\"M12 20v-8\"></path></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "performance impact:medium",
      "zhName": "中"
    },
    "path-tracing": {
      "name": "path-tracing",
      "icon": "<svg viewBox=\"0 0 24 24\" style=\"\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M2.977 19.17h16.222\" style=\"\" transform=\"translate(-.189 -.328) scale(1.09932)\"/><path d=\"M3.889 3.259 12 19.17l5.749-11.277\" style=\"\" transform=\"translate(-1.192 -.328) scale(1.09932)\"/><path d=\"M9.865 6.192h4.623v4.623\" style=\"\" transform=\"scale(1.09931) rotate(-18 20.008 .02)\"/></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "features:path-tracing",
      "zhName": "路径追踪"
    },
    "pbr": {
      "name": "pbr",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"9\" y1=\"18\" x2=\"15\" y2=\"18\"/><line x1=\"10\" y1=\"22\" x2=\"14\" y2=\"22\"/><path d=\"M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14\"/></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "features:pbr",
      "zhName": "物理渲染"
    },
    "potato": {
      "name": "potato",
      "icon": "<svg viewBox=\"0 0 512 512\" fill=\"currentColor\" stroke=\"currentColor\"><g><g><path d=\"M218.913,116.8c-6.4-6.4-16-6.4-22.4,0c-3.2,3.2-4.8,6.4-4.8,11.2s1.6,8,4.8,11.2c3.2,3.2,8,4.8,11.2,4.8    c4.8,0,8-1.6,11.2-4.8c3.2-3.2,4.8-6.4,4.8-11.2S222.113,120,218.913,116.8z\"/></g></g><g><g><path d=\"M170.913,372.8c-6.4-6.4-16-6.4-22.4,0c-3.2,3.2-4.8,6.4-4.8,11.2s1.6,8,4.8,11.2c3.2,3.2,8,4.8,11.2,4.8    c4.8,0,8-1.6,11.2-4.8c3.2-3.2,4.8-8,4.8-11.2C175.713,379.2,174.113,376,170.913,372.8z\"/></g></g><g><g><path d=\"M250.913,228.8c-4.8-6.4-16-6.4-22.4,0c-3.2,3.2-4.8,6.4-4.8,11.2s1.6,8,4.8,11.2c3.2,3.2,8,4.8,11.2,4.8    c4.8,0,8-1.6,11.2-4.8c3.2-3.2,4.8-8,4.8-11.2C255.713,235.2,254.113,232,250.913,228.8z\"/></g></g><g><g><path d=\"M410.913,212.8c-4.8-6.4-16-6.4-22.4,0c-3.2,3.2-4.8,6.4-4.8,11.2s1.6,8,4.8,11.2c3.2,3.2,8,4.8,11.2,4.8    c4.8,0,8-1.6,11.2-4.8c3.2-3.2,4.8-8,4.8-11.2C415.713,219.2,414.113,216,410.913,212.8z\"/></g></g><g><g><path d=\"M346.913,308.8c-4.8-6.4-16-6.4-22.4,0c-3.2,3.2-4.8,6.4-4.8,11.2s1.6,8,4.8,11.2c3.2,3.2,8,4.8,11.2,4.8    c4.8,0,8-1.6,11.2-4.8c3.2-3.2,4.8-8,4.8-11.2C351.713,315.2,350.113,312,346.913,308.8z\"/></g></g><g><g><path d=\"M346.913,100.8c-6.4-6.4-16-6.4-22.4,0c-3.2,3.2-4.8,6.4-4.8,11.2s1.6,8,4.8,11.2c3.2,3.2,8,4.8,11.2,4.8    c4.8,0,8-1.6,11.2-4.8s4.8-6.4,4.8-11.2S350.113,104,346.913,100.8z\"/></g></g><g><g><path d=\"M503.713,142.4c-28.8-136-179.2-142.4-208-142.4c-4.8,0-9.6,0-16,0c-67.2,1.6-132.8,36.8-187.2,97.6    c-60.8,67.2-96,155.2-91.2,227.2c8,126.4,70.4,187.2,192,187.2c115.2,0,201.6-33.6,256-100.8    C513.313,331.2,519.713,219.2,503.713,142.4z M423.713,392c-48,59.2-126.4,89.6-230.4,89.6s-152-48-160-158.4    c-4.8-64,28.8-144,83.2-203.2c48-54.4,107.2-84.8,164.8-88c4.8,0,9.6,0,14.4,0c140.8,0,171.2,89.6,176,116.8    C486.113,219.2,481.313,320,423.713,392z\"/></g></g></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "performance impact:potato",
      "zhName": "低配"
    },
    "realistic": {
      "name": "realistic",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z\"/><circle cx=\"12\" cy=\"13\" r=\"3\"/></svg>",
      "type": "shaderpack",
      "curseforgeCate": 6553,
      "modrinthCate": "categories:realistic",
      "zhName": "写实"
    },
    "reflections": {
      "name": "reflections",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"\"><path d=\"m3 7 5 5-5 5V7\"/><path d=\"m21 7-5 5 5 5V7\"/><path d=\"M12 20v2\"/><path d=\"M12 14v2\"/><path d=\"M12 8v2\"/><path d=\"M12 2v2\"/></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "features:reflections",
      "zhName": "反射"
    },
    "screenshot": {
      "name": "screenshot",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"></rect><circle cx=\"9\" cy=\"9\" r=\"2\"></circle><path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\"></path></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "performance impact:screenshot",
      "zhName": "截图"
    },
    "semi-realistic": {
      "name": "semi-realistic",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"2\" width=\"20\" height=\"20\" rx=\"2.18\" ry=\"2.18\"/><line x1=\"7\" y1=\"2\" x2=\"7\" y2=\"22\"/><line x1=\"17\" y1=\"2\" x2=\"17\" y2=\"22\"/><line x1=\"2\" y1=\"12\" x2=\"22\" y2=\"12\"/><line x1=\"2\" y1=\"7\" x2=\"7\" y2=\"7\"/><line x1=\"2\" y1=\"17\" x2=\"7\" y2=\"17\"/><line x1=\"17\" y1=\"17\" x2=\"22\" y2=\"17\"/><line x1=\"17\" y1=\"7\" x2=\"22\" y2=\"7\"/></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "categories:semi-realistic",
      "zhName": "半写实"
    },
    "shadows": {
      "name": "shadows",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m8 3 4 8 5-5 5 15H2L8 3z\"/></svg>",
      "type": "shaderpack",
      "curseforgeCate": null,
      "modrinthCate": "features:shadows",
      "zhName": "阴影"
    },
    "vanilla-like": {
      "name": "vanilla-like",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"\" data-darkreader-inline-stroke=\"\"><path d=\"m7 11 4.08 10.35a1 1 0 0 0 1.84 0L17 11\"/><path d=\"M17 7A5 5 0 0 0 7 7\"/><path d=\"M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4\"/></svg>",
      "type": "shaderpack",
      "curseforgeCate": 6555,
      "modrinthCate": "categories:vanilla-like",
      "zhName": "类原版"
    }
  }
}