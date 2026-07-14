use serde_json::Value;

pub(crate) fn schema() -> Value {
    serde_json::json!({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "additionalProperties": false,
        "required": ["title", "sections", "risks", "nextSteps"],
        "properties": {
            "title": { "type": "string" },
            "sections": {
                "type": "array",
                "minItems": 1,
                "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["heading", "items"],
                    "properties": {
                        "heading": { "type": "string" },
                        "items": {
                            "type": "array",
                            "minItems": 1,
                            "items": { "$ref": "#/definitions/reportItem" }
                        }
                    }
                }
            },
            "risks": {
                "type": "array",
                "items": { "$ref": "#/definitions/reportItem" }
            },
            "nextSteps": {
                "type": "array",
                "items": { "$ref": "#/definitions/reportItem" }
            }
        },
        "definitions": {
            "reportItem": {
                "type": "object",
                "additionalProperties": false,
                "required": ["summary", "evidenceIds"],
                "properties": {
                    "summary": { "type": "string" },
                    "evidenceIds": {
                        "type": "array",
                        "items": { "type": "string" }
                    }
                }
            }
        }
    })
}
