"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../utils/index");
const compat_1 = require("../utils/compat");
exports.default = (0, index_1.createRule)("no-empty-document", {
    meta: {
        docs: {
            description: "disallow empty document",
            categories: ["recommended", "standard"],
            extensionRule: false,
            layout: false,
        },
        schema: [],
        messages: {
            unexpectedEmpty: "Empty documents are forbidden.",
        },
        type: "suggestion",
    },
    create(context) {
        const sourceCode = (0, compat_1.getSourceCode)(context);
        if (!sourceCode.parserServices.isYAML) {
            return {};
        }
        function isEmptyNode(node) {
            if (!node) {
                return true;
            }
            if (node.type === "YAMLWithMeta") {
                return isEmptyNode(node.value);
            }
            return false;
        }
        return {
            YAMLDocument(node) {
                if (isEmptyNode(node.content)) {
                    context.report({
                        node,
                        messageId: "unexpectedEmpty",
                    });
                }
            },
        };
    },
});
