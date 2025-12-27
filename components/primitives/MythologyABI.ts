export const MythologyABI = [
    {
        "inputs": [],
        "name": "EnumerableSet__IndexOutOfBounds",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "storyId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "chapterId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "title",
                "type": "string"
            }
        ],
        "name": "ChapterCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "storyId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "chapterId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "sectionId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "author",
                "type": "address"
            }
        ],
        "name": "SectionPublished",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "sectionId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "author",
                "type": "address"
            }
        ],
        "name": "SectionUpdated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "storyId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "title",
                "type": "string"
            }
        ],
        "name": "StoryCreated",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "storyId",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "title",
                "type": "string"
            }
        ],
        "name": "createChapter",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "title",
                "type": "string"
            }
        ],
        "name": "createStory",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAllStories",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "id",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "title",
                        "type": "string"
                    }
                ],
                "internalType": "struct TheMythology.Story[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "chapterId",
                "type": "uint256"
            }
        ],
        "name": "getChapter",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "id",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "title",
                        "type": "string"
                    }
                ],
                "internalType": "struct TheMythology.Chapter",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "chapterId",
                "type": "uint256"
            }
        ],
        "name": "getChapterSections",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "id",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "title",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "body",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "mediaURI",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "timePublished",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "author",
                        "type": "address"
                    },
                    {
                        "internalType": "string[]",
                        "name": "sources",
                        "type": "string[]"
                    },
                    {
                        "internalType": "string[]",
                        "name": "keywords",
                        "type": "string[]"
                    }
                ],
                "internalType": "struct TheMythology.Section[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "sectionId",
                "type": "uint256"
            }
        ],
        "name": "getSection",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "id",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "title",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "body",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "mediaURI",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "timePublished",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "author",
                        "type": "address"
                    },
                    {
                        "internalType": "string[]",
                        "name": "sources",
                        "type": "string[]"
                    },
                    {
                        "internalType": "string[]",
                        "name": "keywords",
                        "type": "string[]"
                    }
                ],
                "internalType": "struct TheMythology.Section",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "storyId",
                "type": "uint256"
            }
        ],
        "name": "getStory",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "id",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "title",
                        "type": "string"
                    }
                ],
                "internalType": "struct TheMythology.Story",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "storyId",
                "type": "uint256"
            }
        ],
        "name": "getStoryChapters",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "id",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "title",
                        "type": "string"
                    }
                ],
                "internalType": "struct TheMythology.Chapter[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "storyId",
                "type": "uint256"
            }
        ],
        "name": "getStorySections",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "id",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "title",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "body",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "mediaURI",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "timePublished",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "author",
                        "type": "address"
                    },
                    {
                        "internalType": "string[]",
                        "name": "sources",
                        "type": "string[]"
                    },
                    {
                        "internalType": "string[]",
                        "name": "keywords",
                        "type": "string[]"
                    }
                ],
                "internalType": "struct TheMythology.Section[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "storyId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "chapterId",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "title",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "body",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "mediaURI",
                "type": "string"
            },
            {
                "internalType": "string[]",
                "name": "sources",
                "type": "string[]"
            },
            {
                "internalType": "string[]",
                "name": "keywords",
                "type": "string[]"
            }
        ],
        "name": "publishSection",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "role",
                "type": "string"
            },
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "ieHasRole",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "sectionId",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "title",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "body",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "mediaURI",
                "type": "string"
            },
            {
                "internalType": "string[]",
                "name": "sources",
                "type": "string[]"
            },
            {
                "internalType": "string[]",
                "name": "keywords",
                "type": "string[]"
            }
        ],
        "name": "updateSection",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;
