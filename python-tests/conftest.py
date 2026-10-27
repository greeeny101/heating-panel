"""Loads the integration's plain-Python modules (topics) without Home Assistant.

The package's __init__.py imports Home Assistant, so the package is registered here as an empty module
pointing at its folder; importing `heating_panel.topics` then skips __init__.py.
"""

from pathlib import Path
import sys
import types

PACKAGE = Path(__file__).parents[1] / "custom_components" / "heating_panel"

package = types.ModuleType("heating_panel")
package.__path__ = [str(PACKAGE)]
sys.modules["heating_panel"] = package
