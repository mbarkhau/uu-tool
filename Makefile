# Makefile
#
# Copyright 2019 The bpftrace Authors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

.DEFAULT_GOAL := help

.PHONY: help
help:
	@echo "Makefile available targets:"
	@echo "  serve     - serve the current directory on port 8080"
	@echo "  help      - display this message"


.PHONY: serve
serve:
	@echo "http://localhost:8080"
	@python3 -m http.server 8080